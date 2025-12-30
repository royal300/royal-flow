import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: 'admin' | 'staff';
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        navigate('/login');
      } else if (session.role !== allowedRole) {
        navigate(session.role === 'admin' ? '/admin' : '/staff');
      }
    }
  }, [session, isLoading, allowedRole, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || session.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
