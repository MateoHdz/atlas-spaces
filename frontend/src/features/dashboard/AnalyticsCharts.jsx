import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const STATUS_COLORS = {
  confirmed: '#10b981', // emerald
  pending: '#f59e0b',   // amber
  completed: '#0284c7', // sky
  cancelled: '#f43f5e', // rose
};

const STATUS_LABELS = {
  confirmed: 'Confirmadas',
  pending: 'Pendientes',
  completed: 'Completadas',
  cancelled: 'Canceladas',
};

export function ReservationsByDayChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">Sin datos de reservas diarias</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Bar dataKey="total" name="Total Reservas" fill="#0284c7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReservationsByStatusChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">Sin datos de distribución de estados</p>;
  }

  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#94a3b8',
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsageBySpaceChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">Sin datos de uso por espacio</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis dataKey="spaceName" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={90} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
          />
          <Bar dataKey="totalHours" name="Horas Reservadas" fill="#10b981" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
