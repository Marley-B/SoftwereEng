import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { Database } from '@route-helper/db';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './modules/auth/routes';

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
}

export const buildApp = (opts: BuildAppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });
  app.decorate('db', opts.db);
  app.decorate('config', {
    jwtSecret: opts.jwtSecret,
  });

  void app.register(cors, { origin: true });
  void app.register(sensible);

  app.get('/health', async () => ({ ok: true }));

  void app.register(registerAuthRoutes, { prefix: '/auth' });

  return app;
};
