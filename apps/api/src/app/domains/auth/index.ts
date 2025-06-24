import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

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
 * - POST /register      - Register new user
 * - POST /login         - Login with email/password
 * - POST /refresh       - Refresh access token
 * - POST /logout        - Logout user (protected)
 * - GET /profile        - Get user profile (protected)
 * - PUT /profile        - Update user profile (protected)
 * - PUT /change-password - Change password (protected)
 * - POST /verify-email  - Verify email address (protected)
 *
 * Dependencies:
 * - env plugin (environment configuration)
 * - knex plugin (database access)
 * - jwt plugin (token management)
 * - sensible plugin (HTTP errors)
 * - rate limit plugin (security)
 */
export default fp(async function authModule(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.knex) {
    throw new Error('Auth module requires knex plugin to be loaded first');
  }

  if (!fastify.jwt) {
    throw new Error('Auth module requires jwt plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('Auth module requires jwt authenticate decorator to be available');
  }

  // Setup authentication event subscribers
  try {
    const { setupAuthEventSubscribers } = await import('./subscribers/auth-event-subscribers.js')
    await setupAuthEventSubscribers(fastify)
  } catch (error) {
    fastify.log.error('Failed to setup auth event subscribers', { error })
    throw error
  }
  
  // Auth module only provides services and controllers
  // Routes are registered at API layer for proper versioning
  
  fastify.log.info('✅ Auth module registered successfully with event subscribers');

}, {
  name: 'auth-module',
  dependencies: ['env-plugin', 'knex-plugin', 'jwt-plugin', 'event-bus']
});
