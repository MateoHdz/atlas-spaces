const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo con formato inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

module.exports = { loginSchema };
