import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-slate-900 border-emerald-500/40 text-emerald-300',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    error: {
      bg: 'bg-slate-900 border-rose-500/40 text-rose-300',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
    },
    info: {
      bg: 'bg-slate-900 border-sky-500/40 text-sky-300',
      icon: Info,
      iconColor: 'text-sky-400',
    },
  }[type] || {
    bg: 'bg-slate-900 border-sky-500/40 text-sky-300',
    icon: Info,
    iconColor: 'text-sky-400',
  };

  const IconComponent = config.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${config.bg}`}>
        <IconComponent className={`w-5 h-5 shrink-0 ${config.iconColor}`} />
        <span className="text-xs font-semibold">{message}</span>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2 cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
