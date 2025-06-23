import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Audit Log Module Plugin
 *
 * This plugin encapsulates all audit logging functionality including:
 * - Audit log collection and storage
 * - Audit trail management
 * - Multiple audit adapters (direct, redis, rabbitmq)
 * - Audit integrity verification with hash chains and digital signatures
 * - Tampering detection and proof generation
 * - Security monitoring and compliance reporting
 *
 * Routes provided (via API layer):
 * - GET /audit/audit-logs                      - Get audit logs with filtering
 * - GET /audit/audit-logs/:id                  - Get specific audit log
 * - GET /audit/audit-logs/user/:userId         - Get user audit logs
 * - GET /audit/audit-logs/resource/:type/:id   - Get resource audit logs
 * - GET /audit/audit-logs/stats                - Get audit statistics
 * - POST /audit/audit-logs/cleanup             - Cleanup old audit logs
 * - GET /audit/adapter/stats                   - Get adapter statistics
 * - GET /audit/adapter/health                  - Get adapter health
 * - GET /audit/adapter/info                    - Get adapter info
 * - GET /audit/adapter/queue                   - Get queue status
 * - GET /audit/integrity/stats                 - Get security statistics
 * - POST /audit/integrity/verify               - Verify integrity by date range
 * - POST /audit/integrity/detect-tampering     - Detect tampering
 * - GET /audit/integrity/proof/:id             - Generate integrity proof
 * - POST /audit/integrity/verify-proof         - Verify integrity proof
 * - POST /audit/integrity/full-check           - Run full integrity check
 * - GET /audit/integrity/public-key            - Get public key
 *
 * Dependencies:
 * - env plugin (environment configuration)
 * - knex plugin (database access)
 * - redis plugin (for redis adapter)
 * - jwt plugin (authentication for routes)
 * - rbac plugin (authorization for routes)
 */
export default fp(async function auditLogModule(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.knex) {
    throw new Error('Audit Log module requires knex plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('Audit Log module requires jwt authenticate decorator to be available');
  }

  if (!fastify.rbacRequire) {
    throw new Error('Audit Log module requires rbac plugin to be loaded first');
  }

  // Verify audit middleware is available (from core plugins)
  if (!fastify.auditMiddleware) {
    throw new Error('Audit Log module requires audit middleware to be available');
  }

  // Additional initialization for audit integrity system
  try {
    // Initialize key management system
    // This will be handled by the routes when they are registered
    fastify.log.info('Audit Log module dependencies verified');
  } catch (error) {
    fastify.log.error('Failed to initialize audit log module', error);
    throw error;
  }

  // Audit Log module only provides services and controllers
  // Routes are registered at API layer for proper versioning
  
  fastify.log.info('✅ Audit Log module registered successfully (routes handled by API layer)');

}, {
  name: 'audit-log-module',
  dependencies: ['env-plugin', 'knex-plugin', 'jwt-plugin', 'rbac', 'core-plugins']
});

// Export domain components for use in other modules
export * from './types/audit-log-types';
export * from './schemas/audit-log-schemas';
export * from './repositories/audit-log-repository';
export * from './services/audit-log-service';
export * from './services/audit-integrity.service';
export * from './controllers/audit-log-controller';
export * from './controllers/audit-integrity.controller';