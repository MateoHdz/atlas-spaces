const mongoose = require('mongoose');
const env = require('./env');

/**
 * La cadena de conexión debe apuntar a un replica set (aunque sea de un solo nodo).
 * Esto es intencional: las reservas se crean dentro de una transacción para cerrar
 * la ventana de carrera en la validación de solapamiento (ver ADR aprobado en el roadmap).
 * Sin replica set, mongoose.startSession()/withTransaction() no funciona.
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`[db] Conectado a MongoDB (${mongoose.connection.name})`);

  mongoose.connection.on('error', (err) => {
    console.error('[db] Error de conexión:', err.message);
  });

  return mongoose.connection;
}

function isDbHealthy() {
  // 1 = connected
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbHealthy };
