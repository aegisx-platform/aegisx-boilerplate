import { FastifyInstance } from 'fastify';
import reportTemplateRoutes from '../../../domains/reports/routes/report-template-routes';
import reportDataSourceRoutes from '../../../domains/reports/routes/report-data-source-routes';
import reportGenerationRoutes from '../../../domains/reports/routes/report-generation-routes';
import reportWebSocketRoutes from '../../../domains/reports/routes/report-websocket-routes';

/**
 * Reports API Routes (v1)
 * 
 * Registers all report builder routes under /v1/reports prefix
 * 
 * Available routes:
 * - Template Management: /v1/reports/templates/*
 * - Data Sources: /v1/reports/data-sources/*
 * - Report Generation: /v1/reports/generate/*, /v1/reports/public/*
 * - Report Status: /v1/reports/status/*, /v1/reports/instances/*
 * - Report Analytics: /v1/reports/metrics, /v1/reports/stats
 * - WebSocket: /v1/reports/progress/*, /v1/reports/stream/*, /v1/reports/notifications
 */
export default async function reportsApiRoutes(fastify: FastifyInstance) {
  // Register template management routes
  await fastify.register(reportTemplateRoutes, { prefix: '/reports' });
  
  // Register data source management routes
  await fastify.register(reportDataSourceRoutes, { prefix: '/reports' });
  
  // Register report generation routes
  await fastify.register(reportGenerationRoutes, { prefix: '/reports' });
  
  // Register WebSocket routes for real-time features
  await fastify.register(reportWebSocketRoutes);

  fastify.log.info('✅ Reports API v1 routes loaded')
}