const { z } = require('zod');

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const spaceBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name es requerido').max(120),
    type: z.string().trim().min(1, 'type es requerido').max(60),
    location: z.string().trim().min(1, 'location es requerido').max(120),
    capacity: z.number({ invalid_type_error: 'capacity debe ser un número' }).int().min(1),
    openTime: z.string().regex(HHMM_REGEX, 'openTime debe tener formato HH:mm'),
    closeTime: z.string().regex(HHMM_REGEX, 'closeTime debe tener formato HH:mm'),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const [oh, om] = data.openTime.split(':').map(Number);
      const [ch, cm] = data.closeTime.split(':').map(Number);
      return oh * 60 + om < ch * 60 + cm;
    },
    { message: 'openTime debe ser anterior a closeTime', path: ['closeTime'] }
  );

module.exports = { spaceBodySchema };
