import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { ApiKeyService } from '../../../domains/auth/services/api-key.service';
import { ApiKeyValidation } from '../../../domains/auth/types/auth-types';

/**
 * This plugin adds JWT (JSON Web Token) support for authentication
 *
 * @see https://github.com/fastify/fastify-jwt
 */

// Define JWT payload interface
interface JWTPayload {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
    [key: string]: any;
}

// Extend FastifyInstance interface for JWT methods
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authenticateJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authenticateApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        generateToken: (payload: JWTPayload) => string;
        verifyToken: (token: string) => Promise<JWTPayload>;
        generateRefreshToken: (payload: JWTPayload) => string;
        apiKeyService: ApiKeyService;
    }
    
    interface FastifyRequest {
        authMethod?: 'jwt' | 'api_key';
        apiKeyId?: string;
        userPermissions?: string[];
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
    
    // Initialize API Key Service
    const apiKeyService = new ApiKeyService(fastify, fastify.knex, fastify.log);
    fastify.decorate('apiKeyService', apiKeyService);

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

    // JWT-only authentication decorator
    fastify.decorate('authenticateJWT', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
            request.authMethod = 'jwt';
            
            // JWT token already contains permissions, no need to query DB
            // Permissions are embedded in the token during login
        } catch (err) {
            reply.send(err);
        }
    });

    // API Key-only authentication decorator
    fastify.decorate('authenticateApiKey', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            const apiKey = request.headers['x-api-key'] as string;
            if (!apiKey) {
                throw fastify.httpErrors.unauthorized('API Key required');
            }

            const validation: ApiKeyValidation = await apiKeyService.validateApiKey(
                apiKey,
                request.ip
            );

            if (!validation.valid) {
                throw fastify.httpErrors.unauthorized(validation.reason || 'Invalid API key');
            }

            // Set user context from API key
            request.user = {
                id: validation.user!.id,
                email: validation.user!.email,
                name: validation.user!.name,
                roles: validation.user!.roles || [],
                permissions: validation.user!.permissions || []
            };
            request.authMethod = 'api_key';
            request.apiKeyId = validation.apiKeyId;
            request.userPermissions = validation.user?.permissions;
        } catch (err) {
            reply.send(err);
        }
    });

    // Dual authentication decorator (API Key first, JWT fallback)
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            // 1. Check for API Key first (higher priority)
            const apiKey = request.headers['x-api-key'] as string;
            if (apiKey) {
                const validation: ApiKeyValidation = await apiKeyService.validateApiKey(
                    apiKey,
                    request.ip
                );

                if (!validation.valid) {
                    throw fastify.httpErrors.unauthorized(validation.reason || 'Invalid API key');
                }

                // Set user context from API key
                request.user = {
                    id: validation.user!.id,
                    email: validation.user!.email,
                    name: validation.user!.name,
                    roles: validation.user!.roles || [],
                    permissions: validation.user!.permissions || []
                };
                request.authMethod = 'api_key';
                request.apiKeyId = validation.apiKeyId;
                request.userPermissions = validation.user?.permissions;
                return;
            }

            // 2. Fall back to JWT authentication
            await request.jwtVerify();
            request.authMethod = 'jwt';
            
            // JWT token already contains permissions, no need to query DB
            // Permissions are embedded in the token during login
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
}, {
    name: 'jwt-plugin'
});
