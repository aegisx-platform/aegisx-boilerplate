import Fastify from 'fastify';
import { app } from './app/app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// Instantiate Fastify with some config
// const envToLogger = {
//   development: {
//     transport: {
//       target: 'pino-pretty',
//       options: {
//         translateTime: 'HH:MM:ss Z',
//         ignore: 'pid,hostname',
//       },
//     },
//   },
//   production: true,
//   test: false,
// } as const;

// type Env = keyof typeof envToLogger;
// const environment: Env = (process.env.NODE_ENV as Env) ?? 'development';

const server = Fastify({
  logger: true
});

// Register your application as a normal plugin.
server.register(app);

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    server.log.info(`🚀 Server is running at http://${host}:${port}`);
  }
});
