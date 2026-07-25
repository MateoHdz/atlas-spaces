const Space = require('../../models/Space');
const HttpError = require('../../utils/HttpError');

/**
 * Lista todos los espacios.
 * - admin: activos e inactivos
 * - operator: solo activos
 */
async function listSpaces(role) {
  const filter = role === 'admin' ? {} : { active: true };
  return Space.find(filter).sort({ name: 1 }).lean();
}

/**
 * Crea un espacio nuevo.
 * Solo llamado desde rutas protegidas con requireRole('admin').
 */
async function createSpace(data) {
  const space = await Space.create(data);
  return space.toObject();
}

/**
 * Actualiza un espacio existente (nombre, capacidad, horario, etc.).
 * Devuelve el documento actualizado.
 */
async function updateSpace(id, data) {
  const space = await Space.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();

  if (!space) {
    throw HttpError.notFound('Espacio no encontrado');
  }
  return space;
}

/**
 * Baja lógica: marca el espacio como inactivo.
 * No elimina el registro (preserva historial de reservas).
 */
async function deactivateSpace(id) {
  const space = await Space.findByIdAndUpdate(
    id,
    { active: false },
    { new: true }
  ).lean();

  if (!space) {
    throw HttpError.notFound('Espacio no encontrado');
  }
  return space;
}

/**
 * Obtiene un espacio por ID. Lanza 404 si no existe.
 */
async function getSpaceById(id) {
  const space = await Space.findById(id).lean();
  if (!space) {
    throw HttpError.notFound('Espacio no encontrado');
  }
  return space;
}

module.exports = { listSpaces, createSpace, updateSpace, deactivateSpace, getSpaceById };
