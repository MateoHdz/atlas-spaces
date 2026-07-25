const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operator'], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// No se declara un índice adicional para email: `unique: true` en el campo
// ya crea el índice único. Declararlo dos veces genera un warning de Mongoose
// por índice duplicado.

module.exports = model('User', userSchema);
