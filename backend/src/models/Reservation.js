const { Schema, model } = require('mongoose');

const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const reservationSchema = new Schema(
  {
    space: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    title: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    attendees: { type: Number, required: true, min: 1 },
    // Se guardan siempre en UTC (comportamiento nativo de Date en Mongo).
    // La interpretación en America/Bogota ocurre en utils/timezone.js y en el frontend.
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'pending',
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Soporta: búsqueda de solapamiento por espacio + rango, y los filtros from/to del listado/dashboard/export.
reservationSchema.index({ space: 1, startAt: 1, endAt: 1 });
reservationSchema.index({ status: 1 });

module.exports = model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
