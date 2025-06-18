import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import compress from '@fastify/compress';
import { constants } from 'zlib';

/**
 * This plugin adds response compression support (gzip, deflate, brotli)
 * to reduce bandwidth usage and improve performance
 *
 * @see https://github.com/fastify/fastify-compress
 */
export default fp(async function (fastify: FastifyInstance) {
  // Skip compression in test environment to avoid conflicts with test assertions
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  await fastify.register(compress, {
    // Enable compression for all responses by default
    global: true,
    // Minimum response size to compress (in bytes)
    threshold: 1024,
    // Supported encodings in order of preference
    encodings: ['br', 'gzip', 'deflate'],
    // Compression level for gzip/deflate (1-9, 6 is default)
    zlibOptions: {
      level: 6,
      chunkSize: 1024,
    },
    // Brotli compression options
    brotliOptions: {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
    // Custom compression function for specific routes (optional)
    customTypes: /^text\/|\+json$|\+text$|\+xml$/,
    // Remove content-length header when compressing
    removeContentLengthHeader: true,
    // Compression for specific content types
    onUnsupportedEncoding: (encoding: string, request: FastifyRequest, reply: FastifyReply) => {
      reply.code(406);
      return 'Unsupported encoding';
    },
    // Inflation settings for request decompression
    inflateIfDeflated: true,
    // Request payload compression
    requestEncodings: ['gzip', 'deflate']
  });
});
