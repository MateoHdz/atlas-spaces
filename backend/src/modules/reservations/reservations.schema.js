const { z } = require('zod');

// Campos comunes a create y update (base compartida para no repetir).
// Nota: el .refine() se aplica DESPUÉS del .extend() para que Zod pueda encadenar
// correctamente. Un ZodEffects (resultado de .refine()) no expone .extend().
const reservationBaseObject = z.object({
  space: z.string().min(1, 'space (ID) es requerido'),
  title: z.string().trim().min(1, 'title es requerido').max(200),
  clientName: z.string().trim().min(1, 'clientName es requerido').max(120),
  clientEmail: z.string().email('clientEmail debe ser un email válido'),
  attendees: z
    .number({ invalid_type_error: 'attendees debe ser un número' })
    .int()
    .min(1, 'attendees mínimo es 1'),
  startAt: z.string().datetime({ message: 'startAt debe ser una fecha ISO 8601 válida' }),
  endAt: z.string().datetime({ message: 'endAt debe ser una fecha ISO 8601 válida' }),
  notes: z.string().trim().max(500).optional(),
});

// Validación cruzada de fechas reutilizable
function refineStartBeforeEnd(schema) {
  return schema.refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: 'startAt debe ser anterior a endAt',
    path: ['endAt'],
  });
}

// Schema de creación: acepta todos los campos base.
const createReservationSchema = refineStartBeforeEnd(reservationBaseObject);

// Schema de actualización: permite actualizar estado + campos base.
const updateReservationSchema = refineStartBeforeEnd(
  reservationBaseObject.extend({
    status: z
      .enum(['pending', 'confirmed', 'cancelled', 'completed'], {
        errorMap: () => ({ message: 'status inválido' }),
      })
      .optional(),
  })
);

module.exports = { createReservationSchema, updateReservationSchema };

