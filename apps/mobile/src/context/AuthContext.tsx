import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';
import { storage } from '../services/storage';
import { api, setUnauthorizedHandler } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = async () => {
    await storage.clearAll();
    setUser(null);
  };

  const login = async (token: string, userData: User) => {
    await storage.setToken(token);
    await storage.setUser(userData);
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        await storage.setUser(res.user);
      }
    } catch (e) {
      console.warn('Failed to refresh user profile', e);
    }
  };

  useEffect(() => {
    // Register auto-logout on 401 Unauthorized
    setUnauthorizedHandler(() => {
      logout();
    });

    // Check existing stored session on mount
    const checkSession = async () => {
      try {
        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser) {
          setUser(storedUser);
          // Only verify with server if not a local bypass token
          if (!storedToken.startsWith('mock_') && !storedToken.startsWith('bypass_')) {
            api.auth.getMe()
              .then((res) => {
                if (res.user) setUser(res.user);
              })
              .catch((err: any) => {
                if (err?.statusCode === 401) {
                  logout();
                }
              });
          }
        }
      } catch (err) {
        console.error('Session restoration error', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
