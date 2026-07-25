import { useState, useEffect } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ReservationsByDayChart,
  ReservationsByStatusChart,
  UsageBySpaceChart,
} from './AnalyticsCharts';
import {
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  Clock,
  Percent,
  TrendingUp,
  AlertCircle,
  Filter,
} from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [bySpace, setBySpace] = useState([]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();

      const [summaryRes, dayRes, statusRes, spaceRes] = await Promise.all([
        api.get('/dashboard/summary', { params }),
        api.get('/dashboard/by-day', { params }),
        api.get('/dashboard/by-status', { params }),
        api.get('/dashboard/by-space', { params }),
      ]);

      setSummary(summaryRes.data.data);
      setByDay(dayRes.data.data);
      setByStatus(statusRes.data.data);
      setBySpace(spaceRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error al cargar los datos del Dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [from, to]);

  const handleResetDates = () => {
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-sky-400" />
            <span>Dashboard & Analítica</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Indicadores de ocupación, volumen de reservas y uso de espacios de coworking.
          </p>
        </div>

        {/* Global Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 px-2 text-slate-400 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Periodo:</span>
          </div>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-sky-500"
            title="Fecha Inicial"
          />

          <span className="text-slate-600 text-xs">-</span>

          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-sky-500"
            title="Fecha Final"
          />

          {(from || to) && (
            <button
              onClick={handleResetDates}
              className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 hover:bg-sky-500/10 rounded-lg transition-all cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Cargando métricas analíticas..." />
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reservas */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reservas</span>
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white mt-3">{summary?.totalReservations || 0}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">En el periodo seleccionado</span>
            </div>

            {/* Confirmadas */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmadas</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-emerald-400 mt-3">{summary?.confirmedReservations || 0}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Reservas confirmadas activas</span>
            </div>

            {/* Tasa Ocupación */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa Confirmación</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-purple-400 mt-3">{summary?.occupancyRate || 0}%</p>
              <span className="text-[11px] text-slate-500 mt-1 block">% de reservas no canceladas</span>
            </div>

            {/* Horas Reservadas */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horas Reservadas</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-amber-400 mt-3">{summary?.totalHoursBooked || 0} hrs</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Horas activas acumuladas</span>
            </div>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Reservas por Día */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Reservas por Día</h2>
              </div>
              <ReservationsByDayChart data={byDay} />
            </div>

            {/* Chart 2: Distribución por Estado */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Percent className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Distribución por Estado</h2>
              </div>
              <ReservationsByStatusChart data={byStatus} />
            </div>

            {/* Chart 3: Uso por Espacio (Horas) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Uso por Espacio (Horas Confirmadas / Activas)</h2>
              </div>
              <UsageBySpaceChart data={bySpace} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
