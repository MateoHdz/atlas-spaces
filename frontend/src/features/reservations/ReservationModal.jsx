import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Mail, FileText, AlertCircle, Building2 } from 'lucide-react';

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

  // Sincroniza datos iniciales al abrir o editar
  useEffect(() => {
    if (initialData && isOpen) {
      const start = new Date(initialData.startAt);
      const end = new Date(initialData.endAt);

      const formatDateInput = (d) => d.toISOString().split('T')[0];
      const formatTimeInput = (d) => d.toTimeString().slice(0, 5);

      setFormData({
        space: initialData.space?._id || initialData.space || '',
        title: initialData.title || '',
        clientName: initialData.clientName || '',
        clientEmail: initialData.clientEmail || '',
        attendees: initialData.attendees || 1,
        startAtDate: formatDateInput(start),
        startAtTime: formatTimeInput(start),
        endAtDate: formatDateInput(end),
        endAtTime: formatTimeInput(end),
        status: initialData.status || 'pending',
        notes: initialData.notes || '',
      });
    } else if (isOpen) {
      // Valores por defecto para nueva reserva (mañana a las 09:00 - 10:00)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      setFormData({
        space: spaces.length > 0 ? spaces[0]._id : '',
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
  }, [initialData, isOpen, spaces]);

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

  const selectedSpaceObj = spaces.find((s) => s._id === formData.space);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              value={formData.space}
              onChange={(e) => setFormData({ ...formData, space: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
              required
            >
              <option value="" disabled>Selecciona un espacio</option>
              {spaces.filter((s) => s.active).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} - {s.location} (Capacidad: {s.capacity} pers. | Horario: {s.openTime}-{s.closeTime})
                </option>
              ))}
            </select>
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
                  Máximo permitido: {selectedSpaceObj.capacity} personas
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
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
