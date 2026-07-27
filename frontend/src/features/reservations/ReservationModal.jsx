import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Mail, FileText, AlertCircle, Building2, MapPin } from 'lucide-react';

export default function ReservationModal({
  isOpen,
  onClose,
  onSubmit,
  spaces = [],
  initialData = null,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    space: '',
    title: '',
    clientName: '',
    clientEmail: '',
    attendees: 1,
    startAtDate: '',
    startAtTime: '09:00',
    endAtDate: '',
    endAtTime: '10:00',
    status: 'pending',
    notes: '',
  });

  const [error, setError] = useState('');

  // Inicializa el formulario ÚNICAMENTE cuando el modal se abre (isOpen cambia de false a true)
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const getBogotaParts = (d) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).formatToParts(d);
        const getVal = (type) => parts.find((p) => p.type === type)?.value || '00';
        return {
          date: `${getVal('year')}-${getVal('month')}-${getVal('day')}`,
          time: `${getVal('hour')}:${getVal('minute')}`,
        };
      };

      const start = new Date(initialData.startAt);
      const end = new Date(initialData.endAt);
      const startParts = getBogotaParts(start);
      const endParts = getBogotaParts(end);

      const spaceId = typeof initialData.space === 'object'
        ? String(initialData.space?._id || initialData.space?.id || '')
        : String(initialData.space || '');

      setFormData({
        space: spaceId,
        title: initialData.title || '',
        clientName: initialData.clientName || '',
        clientEmail: initialData.clientEmail || '',
        attendees: initialData.attendees || 1,
        startAtDate: startParts.date,
        startAtTime: startParts.time,
        endAtDate: endParts.date,
        endAtTime: endParts.time,
        status: initialData.status || 'pending',
        notes: initialData.notes || '',
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const defaultSpaceId = spaces.length > 0 ? String(spaces[0]._id || spaces[0].id) : '';

      setFormData({
        space: defaultSpaceId,
        title: '',
        clientName: '',
        clientEmail: '',
        attendees: 1,
        startAtDate: dateStr,
        startAtTime: '09:00',
        endAtDate: dateStr,
        endAtTime: '10:00',
        status: 'pending',
        notes: '',
      });
    }
    setError('');
  }, [isOpen]); // No incluir `spaces` aquí para no reiniciar la selección del usuario al re-renderizar

  // Asegura que el espacio seleccionado exista en la lista y, si no, usa el primer espacio activo
  useEffect(() => {
    if (!isOpen || spaces.length === 0) return;

    const activeSpaces = spaces.filter((space) => space.active !== false);
    if (activeSpaces.length === 0) return;

    const normalizeId = (value) => String(value ?? '').trim().toLowerCase();
    const currentSpaceId = typeof formData.space === 'object'
      ? String(formData.space?._id || formData.space?.id || '')
      : String(formData.space || '');

    const exists = activeSpaces.some((space) => normalizeId(space._id || space.id) === normalizeId(currentSpaceId));

    if (!exists) {
      setFormData((prev) => ({
        ...prev,
        space: String(activeSpaces[0]._id || activeSpaces[0].id),
      }));
    }
  }, [isOpen, spaces, formData.space]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const startAt = new Date(`${formData.startAtDate}T${formData.startAtTime}:00`);
    const endAt = new Date(`${formData.endAtDate}T${formData.endAtTime}:00`);

    if (startAt >= endAt) {
      setError('La fecha y hora de inicio debe ser anterior a la finalización.');
      return;
    }

    const payload = {
      space: formData.space,
      title: formData.title,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      attendees: Number(formData.attendees),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      notes: formData.notes,
      ...(initialData ? { status: formData.status } : {}),
    };

    onSubmit(payload, (serverErrorMsg) => {
      setError(serverErrorMsg);
    });
  };

  // Busca el espacio seleccionado de forma robusta por ID (string)
  const normalizeId = (value) => String(value ?? '').trim().toLowerCase();
  const currentSpaceId = typeof formData.space === 'object'
    ? String(formData.space?._id || formData.space?.id || '')
    : String(formData.space || '');

  const selectedSpaceObj = spaces.find(
    (s) => normalizeId(s._id || s.id) === normalizeId(currentSpaceId)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <Calendar className="w-5 h-5 text-sky-400" />
            <span>{initialData ? 'Editar Reserva' : 'Nueva Reserva'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body con Scroll Interno */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Espacio Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Espacio de Coworking</span>
            </label>
            <select
              value={currentSpaceId}
              onChange={(e) => setFormData((prev) => ({ ...prev, space: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none cursor-pointer"
              required
            >
              <option value="" disabled>Selecciona un espacio</option>
              {spaces.filter((s) => s.active).map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name} ({s.location})
                </option>
              ))}
            </select>

            {/* Info detallada del espacio seleccionado */}
            {selectedSpaceObj && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ubicación / Sede</span>
                    <span className="font-semibold text-slate-200 truncate">{selectedSpaceObj.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Capacidad</span>
                    <span className="font-semibold text-slate-200">{selectedSpaceObj.capacity} personas</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Horario</span>
                    <span className="font-semibold text-sky-400">{selectedSpaceObj.openTime} - {selectedSpaceObj.closeTime}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Título de la reserva */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Título / Motivo
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej. Reunión Mensual de Planeación"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
              required
            />
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Ej. María Pérez"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>Correo del Cliente</span>
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Asistentes & Estado (en edición) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Asistentes</span>
              </label>
              <input
                type="number"
                min="1"
                max={selectedSpaceObj ? selectedSpaceObj.capacity : 100}
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                required
              />
              {selectedSpaceObj && (
                <span className="block text-[10px] text-slate-400 mt-1">
                  Capacidad máxima: {selectedSpaceObj.capacity} personas
                </span>
              )}
            </div>

            {initialData && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none cursor-pointer"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            )}
          </div>

          {/* Rango de Fechas & Horas */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-semibold text-sky-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Franja Horaria de la Reserva</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.startAtDate}
                  onChange={(e) => setFormData({ ...formData, startAtDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={formData.startAtTime}
                  onChange={(e) => setFormData({ ...formData, startAtTime: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.endAtDate}
                  onChange={(e) => setFormData({ ...formData, endAtDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hora Fin</label>
                <input
                  type="time"
                  value={formData.endAtTime}
                  onChange={(e) => setFormData({ ...formData, endAtTime: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notas o Requerimientos Especiales (Opcional)</span>
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Requiere proyector HDMI y servicio de café."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-sky-500 outline-none resize-none"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Procesando...' : initialData ? 'Guardar Cambios' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
