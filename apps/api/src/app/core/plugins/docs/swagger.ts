import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * This plugin adds Swagger documentation for the API
 *
 * @see https://github.com/fastify/fastify-swagger
 * @see https://github.com/fastify/fastify-swagger-ui
 */
export default fp(async function (fastify: FastifyInstance) {
  // Register Swagger documentation generator
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Aegisx Boilerplate API',
        description: 'API documentation for Aegisx Boilerplate project',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@aegisx.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server (API v1)',
        },
        {
          url: 'https://api.aegisx.com',
          description: 'Production server (API v1)',
        },
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and authorization endpoints',
        },
        {
          name: 'User Profile',
          description: 'User profile management endpoints',
        },
        {
          name: 'RBAC - Roles',
          description: 'Role-based access control - Role management',
        },
        {
          name: 'RBAC - Permissions',
          description: 'Role-based access control - Permission management',
        },
        {
          name: 'RBAC - User Management',
          description: 'Role-based access control - User role assignments',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });
});
