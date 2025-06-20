import { FastifyInstance } from 'fastify';
import appPlugin from './core/app';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Load the main application plugin
  await fastify.register(appPlugin, opts);
}
