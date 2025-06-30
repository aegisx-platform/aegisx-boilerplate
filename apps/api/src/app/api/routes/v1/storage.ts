import { FastifyInstance } from 'fastify';
import storageRoutes from '../../../domains/storage/routes/storage.routes';

export default async function storageV1Routes(fastify: FastifyInstance) {
  // Register storage routes with version prefix
  await fastify.register(storageRoutes, { prefix: '/storage' });
}