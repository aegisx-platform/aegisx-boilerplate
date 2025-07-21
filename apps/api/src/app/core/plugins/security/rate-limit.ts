import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

/**
 * This plugin adds rate limiting to protect against abuse and DDoS attacks
 *
 * @see https://github.com/fastify/fastify-rate-limit
 */
export default fp(async function (fastify: FastifyInstance) {
  // Get environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  await fastify.register(rateLimit, {
    // Maximum number of requests per time window
    max: isDevelopment ? 10000 : 100, // Much higher limit for development
    // Time window in milliseconds (15 minutes)
    timeWindow: 15 * 60 * 1000,
    // Skip rate limiting for specific routes using allowList
    allowList: function (request: FastifyRequest) {
      // Skip rate limiting for Swagger documentation routes
      if (request.url.startsWith('/docs')) return true;
      
      // Skip rate limiting for storage routes in development
      if (isDevelopment && request.url.includes('/storage')) return true;
      
      return false;
    },
    // Error response when rate limit is exceeded
    errorResponseBuilder: function (request, context) {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds. Max ${context.max} requests per 15 minutes.`,
        date: Date.now(),
        expiresIn: Math.round(context.ttl / 1000)
      };
    },
    // Add rate limit info to response headers
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    },
    // Different limits for different endpoints
    keyGenerator: function (request: FastifyRequest) {
      // Use IP address as identifier
      return request.ip;
    }
  });
});
