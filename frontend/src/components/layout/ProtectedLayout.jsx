import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProtectedLayout() {
  const { token, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen label="Verificando sesión..." />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
