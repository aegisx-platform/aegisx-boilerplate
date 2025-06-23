import { FastifyInstance } from 'fastify';
import auditLogRoutes from '../../../domains/audit-log/routes/audit-log-routes';
import auditIntegrityRoutes from '../../../domains/audit-log/routes/audit-integrity-routes';
import { auditAdapterRoutes } from '../../../domains/audit-log/routes/audit-adapter-routes';

export default async function auditV1Routes(fastify: FastifyInstance) {
  // Register audit log routes
  await fastify.register(auditLogRoutes, { prefix: '/audit' });
  
  // Register audit integrity routes  
  await fastify.register(auditIntegrityRoutes, { prefix: '/audit' });
  
  // Register audit adapter routes
  await fastify.register(auditAdapterRoutes, { prefix: '/audit' });
}