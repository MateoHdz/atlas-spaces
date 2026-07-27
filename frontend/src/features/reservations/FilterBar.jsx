import { useState, useEffect } from 'react';
import { Search, Filter, FileSpreadsheet, RotateCcw } from 'lucide-react';

export default function FilterBar({
  filters,
  onChange,
  onReset,
  spaces = [],
  onExportCSV,
  exporting = false,
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Sincroniza estado local con prop de filtros externa (ej. al presionar Limpiar)
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounce de 400ms para la búsqueda por texto
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onChange({ ...filters, search: searchTerm, page: 1 });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value, page: 1 });
  };

  const handleReset = () => {
    setSearchTerm('');
    onReset();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <Filter className="w-4 h-4 text-sky-400" />
          <span>Filtros de Búsqueda</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Limpiar Filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={onExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search con Debounce */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente o título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        {/* Space */}
        <div>
          <select
            value={filters.spaceId || ''}
            onChange={(e) => handleChange('spaceId', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
          >
            <option value="">Todos los Espacios</option>
            {spaces.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.location})
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <input
            type="datetime-local"
            value={filters.from || ''}
            onChange={(e) => handleChange('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
            placeholder="Desde"
          />
        </div>

        {/* To Date */}
        <div>
          <input
            type="datetime-local"
            value={filters.to || ''}
            onChange={(e) => handleChange('to', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 outline-none"
            placeholder="Hasta"
          />
        </div>
      </div>
    </div>
  );
}
