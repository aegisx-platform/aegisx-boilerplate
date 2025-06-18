import Fastify, { FastifyInstance } from 'fastify';
import { app } from '../../app';

describe('ETag Plugin', () => {
    let server: FastifyInstance;

    beforeEach(() => {
        // Set NODE_ENV to production to enable ETag plugin
        process.env.NODE_ENV = 'production';
        server = Fastify();
        server.register(app);
    });

    afterEach(() => {
        // Reset NODE_ENV to test
        process.env.NODE_ENV = 'test';
    });

    it('should add ETag header to responses in production', async () => {
        const response = await server.inject({
            method: 'GET',
            url: '/',
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers.etag).toBeDefined();
        expect(response.headers.etag).toMatch(/^"[^"]+"|W\/"[^"]+"/); // ETag format
    });

    it('should return 304 for matching ETag', async () => {
        // First request to get ETag
        const firstResponse = await server.inject({
            method: 'GET',
            url: '/',
        });

        const etag = firstResponse.headers.etag as string;

        // Second request with If-None-Match header
        const secondResponse = await server.inject({
            method: 'GET',
            url: '/',
            headers: {
                'if-none-match': etag,
            },
        });

        expect(secondResponse.statusCode).toBe(304);
        expect(secondResponse.body).toBe('');
    });
});
