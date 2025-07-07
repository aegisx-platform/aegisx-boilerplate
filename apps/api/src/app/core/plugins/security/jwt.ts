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
        generateToken: (payload: JWTPayload) => string;
        verifyToken: (token: string) => Promise<JWTPayload>;
        generateRefreshToken: (payload: JWTPayload) => string;
        apiKeyService: ApiKeyService;
    }
    
    interface FastifyRequest {
        authMethod?: 'jwt' | 'api_key';
        apiKeyId?: string;
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

    // Create authenticate decorator with API key support
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

                // Check rate limit using existing Rate Limiter if available
                // Note: Rate limiting integration would be implemented based on available rate limiter
                // Skip for now to avoid compilation errors

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
                request.permissions = validation.permissions;
                return;
            }

            // 2. Fall back to JWT authentication
            await request.jwtVerify();
            request.authMethod = 'jwt';
            
            // Load user permissions for JWT auth
            if (request.user && fastify.knex) {
                const permissions = await fastify.knex('permissions as p')
                    .join('role_permissions as rp', 'p.id', 'rp.permission_id')
                    .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
                    .where('ur.user_id', request.user.id)
                    .select('p.name')
                    .pluck('name');
                
                (request.user as any).permissions = permissions;
            }
        } catch (err) {
            // Use existing error tracker if available
            // Note: Error tracking integration would be implemented based on available error tracker
            // Skip for now to avoid compilation errors
            
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
