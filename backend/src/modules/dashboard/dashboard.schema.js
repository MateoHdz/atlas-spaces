const { z } = require('zod');

const dashboardQuerySchema = z
  .object({
    from: z.string().datetime({ message: 'from debe ser una fecha ISO 8601 válida' }).optional(),
    to: z.string().datetime({ message: 'to debe ser una fecha ISO 8601 válida' }).optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    { message: 'from no puede ser posterior a to', path: ['to'] }
  );

module.exports = { dashboardQuerySchema };
