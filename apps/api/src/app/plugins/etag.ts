import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import etag from '@fastify/etag';

/**
 * This plugin adds ETag header support for HTTP caching
 * ETags help with caching by providing a unique identifier for the response content
 *
 * @see https://github.com/fastify/fastify-etag
 */
export default fp(async function (fastify: FastifyInstance) {
  // Skip ETag in test environment to avoid conflicts with test assertions
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  await fastify.register(etag, {
    // Algorithm for generating ETags
    // Options: 'fnv1a' (default), 'sha1', 'sha256', 'md5'
    algorithm: 'fnv1a',

    // Whether to generate weak ETags (default: false)
    // Weak ETags are prefixed with W/ and are less strict about content matching
    weak: false,
  });
});
