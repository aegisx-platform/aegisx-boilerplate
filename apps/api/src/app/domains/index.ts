import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Domain modules
import authDomain from './auth';
import rbacDomain from './rbac';
import userManagementDomain from './user-management';

const domainsPlugin: FastifyPluginAsync = async (fastify) => {
  // Load all domain modules
  await fastify.register(authDomain);
  await fastify.register(rbacDomain);
  await fastify.register(userManagementDomain);

  fastify.log.info('✅ Domain modules loaded successfully');
};

export default fp(domainsPlugin, {
  name: 'domains-plugin',
  dependencies: ['core-plugins']
});