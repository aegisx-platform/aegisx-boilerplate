import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'path';

/**
 * This plugin serves static files from the file system
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async function (fastify: FastifyInstance) {
    // Serve static files from public directory
    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), 'apps/api/src/assets'),
        prefix: '/public/', // optional: default '/'
        constraints: {}, // optional: default {}
        decorateReply: true, // the reply object will be decorated with sendFile function
        schemaHide: true, // hide the route from swagger documentation
        dotfiles: 'ignore', // how to treat dotfiles
        etag: true, // enable etag generation
        lastModified: true, // enable last-modified header
        maxAge: '1d', // cache control max-age directive
        immutable: false, // cache control immutable directive
        cacheControl: true, // enable cache-control header
        acceptRanges: true, // enable accept-ranges header for partial content
        preCompressed: false, // enable pre-compressed file serving
        wildcard: true, // enable wildcard matching
        // Custom index files
        index: ['index.html', 'index.htm'],
        // Serve directory listing when no index file found
        list: false,
        // Custom error handling
        setHeaders: function (res, path) {
            // Set custom headers for all static files
            res.setHeader('X-Served-By', 'Fastify-Static');

            // Set different cache headers based on file type
            if (path.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            } else if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
            }
        }
    });

    // Optional: Register another static route for uploads
    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), 'uploads'),
        prefix: '/uploads/',
        decorateReply: false, // don't decorate reply since we already did it above
        schemaHide: true,
        maxAge: '7d'
    });
});
