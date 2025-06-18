import * as path from 'path';
import { FastifyInstance } from 'fastify';
import allPlugins from './plugins/load-plugins';
import AutoLoad from '@fastify/autoload';

/* eslint-disable-next-line */
export interface AppOptions { }

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  await fastify.register(allPlugins);

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: { ...opts },
  });
}
