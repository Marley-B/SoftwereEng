import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { Database } from '@route-helper/db';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  GoogleApiQuota,
  type GoogleApiQuotaConfig,
  parseGoogleApiQuotaConfig,
} from './lib/googleApiQuota.js';
import { registerAuthRoutes } from './modules/auth/routes';
import { registerMeRoutes } from './modules/me/routes';
import { registerPlacesRoutes } from './modules/places/routes';
import { registerCommuteRoutes } from './modules/routes/routes';

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
  googleRoutesApiKey: string;
  googleApiQuota?: GoogleApiQuota;
  googleApiQuotaConfig?: GoogleApiQuotaConfig;
}

export const buildApp = (opts: BuildAppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });
  app.decorate('db', opts.db);
  const quotaConfig = opts.googleApiQuotaConfig ?? parseGoogleApiQuotaConfig();
  app.decorate(
    'googleApiQuota',
    opts.googleApiQuota ?? new GoogleApiQuota(quotaConfig),
  );
  app.decorate('config', {
    jwtSecret: opts.jwtSecret,
    googleRoutesApiKey: opts.googleRoutesApiKey,
  });

  void app.register(cors, { origin: true });
  void app.register(sensible);

  app.get('/health', async () => ({ ok: true }));

  void app.register(registerAuthRoutes, { prefix: '/auth' });
  void app.register(registerCommuteRoutes, { prefix: '/routes' });
  void app.register(registerMeRoutes, { prefix: '/me' });
  void app.register(registerPlacesRoutes, { prefix: '/places' });

  return app;
};
