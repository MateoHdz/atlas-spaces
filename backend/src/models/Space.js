const { Schema, model } = require('mongoose');

// Validador simple de formato "HH:mm" en 24h.
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const spaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }, // sala, oficina, auditorio...
    location: { type: String, required: true, trim: true }, // sede (string simple, ver README)
    capacity: { type: Number, required: true, min: 1 },
    openTime: {
      type: String,
      required: true,
      match: [HHMM_REGEX, 'openTime debe tener formato HH:mm'],
    },
    closeTime: {
      type: String,
      required: true,
      match: [HHMM_REGEX, 'closeTime debe tener formato HH:mm'],
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

spaceSchema.index({ active: 1 });

module.exports = model('Space', spaceSchema);
