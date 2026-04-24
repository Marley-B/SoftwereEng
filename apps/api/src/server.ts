import "dotenv/config";
import { buildApp } from "./app";

const startServer = async (): Promise<void> => {
  const app = buildApp();
  const host = process.env.API_HOST ?? "0.0.0.0";
  const port = Number(process.env.API_PORT ?? 3000);

  await app.listen({ host, port });
};

void startServer();
