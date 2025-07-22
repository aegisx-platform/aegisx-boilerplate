import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

/**
 * This plugin adds CORS support to allow cross-origin requests
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.after();

  const { CORS_ORIGIN } = fastify.config;

  // Parse CORS_ORIGIN (can be comma-separated list or single value)
  let origin: string | string[] | boolean = true;
  
  if (CORS_ORIGIN) {
    if (CORS_ORIGIN === '*') {
      origin = true;
    } else {
      // Split by comma and trim whitespace
      const origins = CORS_ORIGIN.split(',').map(o => o.trim());
      origin = origins.length === 1 ? origins[0] : origins;
    }
  }

  await fastify.register(cors, {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin',
      'x-correlation-id'
    ]
  });

  fastify.log.info('✅ CORS plugin registered', { origin });
});