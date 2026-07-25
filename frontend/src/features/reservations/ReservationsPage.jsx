import { useState, useEffect } from 'react';
import api from '../../api/client';
import FilterBar from './FilterBar';
import ReservationModal from './ReservationModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime, RESERVATION_STATUS_CONFIG } from '../../utils/formatters';
import { CalendarDays, Plus, Edit2, Ban, ChevronLeft, ChevronRight, AlertCircle, Building2 } from 'lucide-react';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    spaceId: '',
    from: '',
    to: '',
    search: '',
    sortBy: 'startAt',
    sortOrder: 'asc',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [saving, setSaving] = useState(false);

  // Carga espacios para el filtro y selector de modal
  useEffect(() => {
    async function loadSpaces() {
      try {
        const res = await api.get('/spaces');
        setSpaces(res.data.data);
      } catch (err) {
        console.error('Error al cargar espacios', err);
      }
    }
    loadSpaces();
  }, []);

  // Carga reservas segun filtros activos
  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const cleanParams = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanParams[key] = filters[key];
      });

      const res = await api.get('/reservations', { params: cleanParams });
      setReservations(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error al cargar las reservas');
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      status: '',
      spaceId: '',
      from: '',
      to: '',
      search: '',
      sortBy: 'startAt',
      sortOrder: 'asc',
    });
  };

  const handleOpenCreate = () => {
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setSelectedReservation(res);
    setIsModalOpen(true);
  };

  const handleSaveReservation = async (payload, onErrorCallback) => {
    setSaving(true);
    try {
      if (selectedReservation) {
        await api.put(`/reservations/${selectedReservation._id}`, payload);
      } else {
        await api.post('/reservations', payload);
      }
      setIsModalOpen(false);
      fetchReservations();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Error al procesar la reserva';
      if (onErrorCallback) onErrorCallback(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReservation = async (res) => {
    if (!window.confirm(`¿Estás seguro de cancelar la reserva "${res.title}"?`)) return;

    try {
      await api.patch(`/reservations/${res._id}/cancel`);
      fetchReservations();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error al cancelar la reserva');
    }
  };

  // Dispara la descarga del archivo CSV con los filtros actuales
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const cleanParams = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key] && key !== 'page' && key !== 'limit') {
          cleanParams[key] = filters[key];
        }
      });

      const response = await api.get('/reservations/export', {
        params: cleanParams,
        responseType: 'blob',
      });

      // Crear URL de descarga nativa en el navegador
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reservaciones_atlas_spaces_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar la exportación CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-sky-400" />
            <span>Gestión de Reservas</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Consulta, crea y opera las reservas de espacios de coworking.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Reserva</span>
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        spaces={spaces}
        onExportCSV={handleExportCSV}
        exporting={exporting}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Table / Cards */}
      {loading ? (
        <LoadingSpinner label="Cargando reservas..." />
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-base">No se encontraron reservas con los filtros aplicados</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Título / Motivo</th>
                  <th className="py-3.5 px-4">Espacio / Ubicación</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Fecha & Hora</th>
                  <th className="py-3.5 px-4 text-center">Asistentes</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {reservations.map((r) => {
                  const statusConf = RESERVATION_STATUS_CONFIG[r.status] || RESERVATION_STATUS_CONFIG.pending;
                  return (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-100 block">{r.title}</span>
                        {r.notes && <span className="text-[10px] text-slate-500 truncate max-w-xs block">{r.notes}</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{r.space?.name || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{r.space?.location}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-200 block">{r.clientName}</span>
                        <span className="text-[10px] text-slate-400 block">{r.clientEmail}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="block font-medium text-slate-200">{formatDateTime(r.startAt)}</span>
                        <span className="text-[10px] text-slate-400">hasta {formatDateTime(r.endAt)}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-300">
                        {r.attendees} pers.
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(r)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                title="Editar Reserva"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {['pending', 'confirmed'].includes(r.status) && (
                                <button
                                  onClick={() => handleCancelReservation(r)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                  title="Cancelar Reserva"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Mostrando <strong className="text-slate-200">{reservations.length}</strong> de{' '}
              <strong className="text-slate-200">{pagination.total}</strong> reservas
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span>
                Página <strong className="text-slate-200">{pagination.page}</strong> de{' '}
                <strong className="text-slate-200">{pagination.totalPages || 1}</strong>
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveReservation}
        spaces={spaces}
        initialData={selectedReservation}
        loading={saving}
      />
    </div>
  );
}
