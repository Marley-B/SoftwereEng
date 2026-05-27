import { createDb, runMigrations } from '@route-helper/db';
import 'dotenv/config';
import { buildApp } from './app';

const startServer = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  await runMigrations(databaseUrl);
  const db = createDb(databaseUrl);
  const app = buildApp({ db, jwtSecret });

  const host = process.env.API_HOST ?? '0.0.0.0';
  const port = Number(process.env.API_PORT ?? 3000);

  await app.listen({ host, port });
};

void startServer();
