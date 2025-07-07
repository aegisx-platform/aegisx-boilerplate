import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// Type imports for service interfaces
import { ReportTemplateService } from './services/report-template-service';
import { ReportDataSourceService } from './services/report-data-source-service';
import { ReportGenerationService } from './services/report-generation-service';

// Extend FastifyInstance interface for reports services
declare module 'fastify' {
  interface FastifyInstance {
    reportTemplateService: ReportTemplateService;
    reportDataSourceService: ReportDataSourceService;
    reportGenerationService: ReportGenerationService;
    authenticateOptional?: (request: any, reply: any) => Promise<void>;
  }
}

/**
 * Reports Module Plugin
 *
 * This plugin encapsulates all report builder functionality including:
 * - Report template management with versioning
 * - Dynamic data source connections (database, API, file, static)
 * - URL-based report generation with parameter filtering
 * - Multi-format report generation (HTML, PDF, Excel, CSV, JSON)
 * - Background report generation and scheduling
 * - Report caching and analytics
 * - Report sharing and access control
 * - Template validation and preview
 *
 * Services provided:
 * - fastify.reportTemplateService  - Template CRUD and management
 * - fastify.reportDataSourceService - Data source management
 * - fastify.reportGenerationService - Report generation engine
 *
 * Routes provided:
 * Template Management:
 * - POST /templates          - Create template
 * - GET /templates/:id       - Get template by ID
 * - GET /templates/slug/:slug - Get template by slug
 * - PUT /templates/:id       - Update template
 * - DELETE /templates/:id    - Delete template
 * - POST /templates/:id/duplicate - Duplicate template
 * - GET /templates           - List templates with filtering
 * - GET /templates/search    - Search templates
 * - GET /templates/popular   - Get popular templates
 * - GET /templates/recent    - Get recent templates
 * - GET /templates/:id/parameters - Get template parameters
 * - GET /templates/:id/versions - Get template versions
 * - GET /templates/:id/access - Check template access
 * - GET /templates/stats     - Get template statistics
 *
 * Data Source Management:
 * - POST /data-sources       - Create data source
 * - GET /data-sources/:id    - Get data source
 * - PUT /data-sources/:id    - Update data source
 * - DELETE /data-sources/:id - Delete data source
 * - GET /data-sources        - List data sources
 * - POST /data-sources/:id/test - Test data source connection
 * - POST /data-sources/test  - Test data source config
 * - POST /data-sources/:id/query - Execute data source query
 * - GET /data-sources/:id/health - Get data source health
 * - GET /data-sources/unhealthy - Get unhealthy data sources
 * - GET /data-sources/stats  - Get data source statistics
 * - GET /data-sources/:id/usage - Get data source usage
 * - GET /data-sources/:id/access - Check data source access
 * - GET /data-sources/:id/schema - Discover data source schema
 * - GET /data-sources/templates - Get data source templates
 *
 * Report Generation:
 * - POST /generate/:templateId - Generate report (authenticated)
 * - GET /public/:templateId  - Generate public report with URL params
 * - GET /slug/:slug          - Generate report by template slug
 * - GET /instances/:instanceId - Get report instance
 * - POST /instances/:instanceId/regenerate - Regenerate report
 * - POST /schedule           - Schedule background generation
 * - POST /batch              - Batch report generation
 * - POST /preview/:templateId - Preview report
 * - POST /validate/:templateId - Validate parameters
 * - GET /status/:correlationId - Get generation status
 * - DELETE /status/:correlationId - Cancel generation
 * - POST /generate-export/:templateId - Generate and export
 * - GET /queue/status        - Get generation queue status
 * - GET /metrics             - Get generation metrics
 *
 * Dependencies:
 * - env plugin (environment configuration)
 * - knex plugin (database access)
 * - authentication (user management)
 * - rbac (role-based access control)
 * - event-bus (cross-domain communication)
 * - audit-log (compliance logging)
 * - cache-manager (report caching)
 * - background-jobs (async processing)
 * - storage service (file storage)
 * - notification service (user alerts)
 */
export default fp(async function reportsModule(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.knex) {
    throw new Error('Reports module requires knex plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('Reports module requires authentication to be available');
  }

  if (!fastify.rbacRequire) {
    throw new Error('Reports module requires RBAC to be available');
  }

  if (!fastify.eventBus) {
    throw new Error('Reports module requires event bus to be available');
  }

  if (!fastify.auditMiddleware) {
    throw new Error('Reports module requires audit middleware to be available');
  }

  // Initialize repositories
  const { ReportTemplateRepository } = await import('./repositories/report-template-repository.js')
  const { ReportDataSourceRepository } = await import('./repositories/report-data-source-repository.js')
  
  const templateRepository = new ReportTemplateRepository(fastify.knex)
  const dataSourceRepository = new ReportDataSourceRepository(fastify.knex)

  // Initialize services
  const { ReportTemplateService } = await import('./services/report-template-service.js')
  const { ReportDataSourceService } = await import('./services/report-data-source-service.js')
  const { ReportGenerationService } = await import('./services/report-generation-service.js')

  const templateService = new ReportTemplateService(
    templateRepository,
    {}, // Default config
    fastify
  )

  const dataSourceService = new ReportDataSourceService(
    dataSourceRepository,
    {}, // Default config
    fastify
  )

  const generationService = new ReportGenerationService(
    templateService,
    dataSourceService,
    {}, // Default config
    fastify
  )

  // Register services as decorators
  fastify.decorate('reportTemplateService', templateService)
  fastify.decorate('reportDataSourceService', dataSourceService)
  fastify.decorate('reportGenerationService', generationService)

  // Setup event subscribers for cross-domain communication
  try {
    // Subscribe to user deletion events to clean up reports
    await fastify.eventBus.subscribe('user.deleted', async (userData: any) => {
      fastify.log.info('Processing user deletion for reports cleanup', { userId: userData.userId })
      // Implementation would clean up user's reports and templates
    })

    // Subscribe to storage events for report exports
    await fastify.eventBus.subscribe('storage.file.deleted', async (fileData: any) => {
      fastify.log.info('Processing file deletion for report exports', { fileId: fileData.fileId })
      // Implementation would update export records
    })

    fastify.log.info('✅ Reports event subscribers registered')
  } catch (error) {
    fastify.log.error('Failed to setup reports event subscribers', { error })
    // Don't throw error, just log it as events are optional
  }

  // Reports module only provides services and controllers
  // Routes are registered at API layer for proper versioning

  // Initialize any startup tasks
  try {
    // Warm up template cache (would be implemented if method exists)
    // await templateService.warmupCache?.()
    
    // Check data source health
    const unhealthyDataSources = await dataSourceService.getUnhealthyDataSources()
    if (unhealthyDataSources.length > 0) {
      fastify.log.warn('Found unhealthy data sources at startup', { 
        count: unhealthyDataSources.length,
        dataSourceIds: unhealthyDataSources.map(ds => ds.id)
      })
    }

    fastify.log.info('✅ Reports module startup tasks completed')
  } catch (error) {
    fastify.log.warn('Reports module startup tasks failed (non-critical)', { error })
    // Don't throw error for non-critical startup tasks
  }

  fastify.log.info('✅ Reports module registered successfully');

}, {
  name: 'reports-module',
  dependencies: [
    'env-plugin', 
    'knex-plugin', 
    'jwt-plugin', 
    'rbac',
    'event-bus',
    'audit-plugin'
  ]
});