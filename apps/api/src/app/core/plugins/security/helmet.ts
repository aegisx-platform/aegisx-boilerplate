import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

/**
 * This plugin adds security headers to protect against common vulnerabilities
 *
 * @see https://github.com/fastify/fastify-helmet
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false,
    // Other security headers
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
});
