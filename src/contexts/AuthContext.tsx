import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, authService, initializeDefaultAdmin } from '@/lib/storage';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'admin' | 'staff') => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeDefaultAdmin();
    const existingSession = authService.getSession();
    setSession(existingSession);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: 'admin' | 'staff'): Promise<boolean> => {
    const newSession = await authService.login(email, password, role);
    if (newSession) {
      setSession(newSession);
      return true;
    }
    return false;
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
