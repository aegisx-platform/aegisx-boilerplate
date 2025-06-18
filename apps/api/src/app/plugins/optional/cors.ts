import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

/**
 * This plugin enables CORS (Cross-Origin Resource Sharing) for the API
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(cors, {
    // Allow all origins in development, restrict in production
    origin: process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com']
      : true,
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
});
