const bcrypt = require('bcrypt');
const User = require('../../models/User');
const HttpError = require('../../utils/HttpError');
const { signToken } = require('../../utils/jwt');

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });

  // Mensaje genérico a propósito: no revela si el correo existe, si está inactivo,
  // o si la contraseña es incorrecta. Evita enumeración de usuarios y no expone
  // información sensible del servidor en la respuesta de error (requisito del brief).
  const invalidCredentials = () => HttpError.unauthorized('Credenciales inválidas');

  if (!user || !user.active) {
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const token = signToken({ sub: user._id.toString(), role: user.role });

  return { token, user: toPublicUser(user) };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.active) {
    throw HttpError.unauthorized('Sesión inválida');
  }
  return toPublicUser(user);
}

module.exports = { login, getCurrentUser };
