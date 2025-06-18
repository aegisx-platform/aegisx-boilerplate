import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { authRoutes } from './routes/auth-routes';
import rbacRoutes from './routes/rbac-routes';

/**
 * Authentication Module Plugin
 *
 * This plugin encapsulates all authentication functionality including:
 * - User registration and login
 * - JWT token management (access & refresh tokens)
 * - Protected route authentication
 * - User profile management
 * - Password management
 *
 * Routes provided:
 * - POST /auth/register      - Register new user
 * - POST /auth/login         - Login with email/password
 * - POST /auth/refresh       - Refresh access token
 * - POST /auth/logout        - Logout user (protected)
 * - GET /auth/profile        - Get user profile (protected)
 * - PUT /auth/profile        - Update user profile (protected)
 * - PUT /auth/change-password - Change password (protected)
 * - POST /auth/verify-email  - Verify email address (protected)
 *
 * Dependencies:
 * - env plugin (environment configuration)
 * - knex plugin (database access)
 * - jwt plugin (token management)
 * - sensible plugin (HTTP errors)
 */
export default fp(async function authPlugin(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.knex) {
    throw new Error('Auth plugin requires knex plugin to be loaded first');
  }

  if (!fastify.jwt) {
    throw new Error('Auth plugin requires jwt plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('Auth plugin requires jwt authenticate decorator to be available');
  }

  // Register authentication routes with /auth prefix
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // Register RBAC routes with /rbac prefix
  await fastify.register(rbacRoutes, { prefix: '/rbac' });

  fastify.log.info('✅ Auth plugin registered with routes:');
  fastify.log.info('   POST   /auth/register');
  fastify.log.info('   POST   /auth/login');
  fastify.log.info('   POST   /auth/refresh');
  fastify.log.info('   POST   /auth/logout        (protected)');
  fastify.log.info('   GET    /auth/profile       (protected)');
  fastify.log.info('   PUT    /auth/profile       (protected)');
  fastify.log.info('   PUT    /auth/change-password (protected)');
  fastify.log.info('   POST   /auth/verify-email  (protected)');
  fastify.log.info('');
  fastify.log.info('✅ RBAC plugin registered with routes:');
  fastify.log.info('   GET    /rbac/roles         (admin)');
  fastify.log.info('   POST   /rbac/roles         (admin)');
  fastify.log.info('   GET    /rbac/roles/:id     (admin)');
  fastify.log.info('   PUT    /rbac/roles/:id     (admin)');
  fastify.log.info('   DELETE /rbac/roles/:id     (admin)');
  fastify.log.info('   GET    /rbac/permissions   (admin)');
  fastify.log.info('   POST   /rbac/roles/:id/permissions (admin)');
  fastify.log.info('   GET    /rbac/users/:id/roles (admin)');
  fastify.log.info('   POST   /rbac/users/:id/roles (admin)');
  fastify.log.info('   DELETE /rbac/users/:userId/roles/:roleId (admin)');
  fastify.log.info('   GET    /rbac/me/permissions (protected)');

}, {
  name: 'auth-plugin',
  dependencies: ['env-plugin', 'knex-plugin', 'jwt-plugin', 'rbac']
});
