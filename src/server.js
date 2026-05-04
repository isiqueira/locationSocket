import { connectMongo } from './infra/mongo.js';
import { buildApp } from './app.js';
import { PORT } from './config/env.js';

await connectMongo();

const app = await buildApp();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
