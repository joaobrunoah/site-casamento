import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (hash: string) => void;
  logout: () => void;
  getAuthHash: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check localStorage on initialization
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  useEffect(() => {
    // Sync with localStorage
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authHash');
    }
  }, [isAuthenticated]);

  const login = (hash: string) => {
    setIsAuthenticated(true);
    localStorage.setItem('authHash', hash);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authHash');
  };

  const getAuthHash = (): string | null => {
    return localStorage.getItem('authHash');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, getAuthHash }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
