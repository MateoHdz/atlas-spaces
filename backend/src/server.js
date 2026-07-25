const env = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');

async function start() {
  await connectDB();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] Atlas Spaces API escuchando en puerto ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('[server] No se pudo iniciar la aplicación:', err);
  process.exit(1);
});
