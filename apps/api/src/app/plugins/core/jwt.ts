import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

/**
 * This plugin adds JWT (JSON Web Token) support for authentication
 *
 * @see https://github.com/fastify/fastify-jwt
 */

// Define JWT payload interface
interface JWTPayload {
    id: string;
    email: string;
    role?: string;
    [key: string]: string | number | boolean | undefined;
}

// Extend FastifyInstance interface for JWT methods
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        generateToken: (payload: JWTPayload) => string;
        verifyToken: (token: string) => Promise<JWTPayload>;
        generateRefreshToken: (payload: JWTPayload) => string;
    }
}

// Extend FastifyRequest interface for user property
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JWTPayload;
        user: JWTPayload;
    }
}

export default fp(async function (fastify: FastifyInstance) {
    // Make sure env plugin is loaded first
    await fastify.after();

    await fastify.register(jwt, {
        secret: fastify.config.JWT_SECRET,
        sign: {
            expiresIn: fastify.config.JWT_EXPIRES_IN,
            algorithm: 'HS256'
        },
        verify: {
            algorithms: ['HS256']
        },
        // Custom error messages
        messages: {
            badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
            badCookieRequestErrorMessage: 'Cookie could not be parsed in request',
            noAuthorizationInHeaderMessage: 'Authorization header is missing!',
            noAuthorizationInCookieMessage: 'Authorization cookie is missing!',
            authorizationTokenExpiredMessage: 'Authorization token expired',
            authorizationTokenInvalid: 'Authorization token is invalid',
            authorizationTokenUntrusted: 'Untrusted authorization token'
        }
    });

    // Create authenticate decorator
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });

    // Add utility methods for JWT
    fastify.decorate('generateToken', function (this: FastifyInstance, payload: JWTPayload) {
        return this.jwt.sign(payload);
    });

    fastify.decorate('verifyToken', async function (this: FastifyInstance, token: string) {
        return await this.jwt.verify(token);
    });

    // Optional: Add refresh token support
    fastify.decorate('generateRefreshToken', function (this: FastifyInstance, payload: JWTPayload) {
        return this.jwt.sign(payload, { expiresIn: '7d' });
    });
});
