import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import SpaceModal from './SpaceModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Building2, Plus, Edit2, Power, Users, Clock, MapPin, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [saving, setSaving] = useState(false);

  // Toast & ConfirmModal
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const { isAdmin } = useAuth();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchSpaces = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/spaces');
      setSpaces(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error al cargar los espacios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleOpenCreate = () => {
    setSelectedSpace(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (space) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

  const handleSaveSpace = async (formData) => {
    setSaving(true);
    try {
      if (selectedSpace) {
        await api.put(`/spaces/${selectedSpace._id}`, formData);
        showToast('Espacio actualizado con éxito', 'success');
      } else {
        await api.post('/spaces', formData);
        showToast('Espacio creado con éxito', 'success');
      }
      setIsModalOpen(false);
      fetchSpaces();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error al guardar el espacio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.patch(`/spaces/${deactivateTarget._id}/deactivate`);
      showToast(`Espacio "${deactivateTarget.name}" desactivado con éxito`, 'info');
      setDeactivateTarget(null);
      fetchSpaces();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error al desactivar el espacio', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (space) => {
    try {
      await api.put(`/spaces/${space._id}`, { ...space, active: true });
      showToast(`Espacio "${space.name}" reactivado con éxito`, 'success');
      fetchSpaces();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error al reactivar el espacio', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Cargando espacios..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivateTarget}
        title="Desactivar Espacio"
        message={`¿Estás seguro de desactivar el espacio "${deactivateTarget?.name}"? Los usuarios ya no podrán realizar nuevas reservas en este espacio.`}
        confirmText="Sí, Desactivar"
        cancelText="Volver"
        variant="warning"
        loading={deactivating}
        onConfirm={handleConfirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sky-400" />
            <span>Gestión de Espacios</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin
              ? 'Administra los espacios de coworking, capacidades y horarios de operación.'
              : 'Consulta la disponibilidad, capacidades y horarios de las salas y oficinas.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Espacio</span>
          </button>
        )}
      </div>

      {/* Operator Notice */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-3 text-slate-400 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Rol Operador: Tienes acceso de solo lectura sobre los espacios de la plataforma.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Spaces Grid */}
      {spaces.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-base">No hay espacios registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div
              key={space._id}
              className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                space.active ? 'border-slate-800' : 'border-rose-900/30 opacity-75'
              }`}
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg leading-snug">{space.name}</h3>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-sky-400 uppercase tracking-wider bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                      {space.type}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      space.active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {space.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-400 my-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{space.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Capacidad: <strong className="text-slate-200">{space.capacity} personas</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Horario: <strong className="text-slate-200">{space.openTime} - {space.closeTime}</strong></span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenEdit(space)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                    aria-label={`Editar espacio ${space.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {space.active ? (
                    <button
                      onClick={() => setDeactivateTarget(space)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                      aria-label={`Desactivar espacio ${space.name}`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Desactivar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(space)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                      aria-label={`Reactivar espacio ${space.name}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reactivar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveSpace}
        initialData={selectedSpace}
        loading={saving}
      />
    </div>
  );
}
