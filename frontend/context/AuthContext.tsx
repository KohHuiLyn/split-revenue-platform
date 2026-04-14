import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  displayName?: string;
  walletAddress: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  loginWithKeyless: () => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Check if user is logged in on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tok: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      localStorage.removeItem('token');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, displayName?: string) => {
    try {
      // Try login first
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
        displayName
      });
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      router.push('/dashboard');
    } catch (loginError: any) {
      // If login fails with invalid credentials, try signup (auto-register)
      if (loginError.response?.status === 401 && loginError.response?.data?.error === 'Invalid credentials') {
        try {
          const signupResponse = await axios.post(`${API_URL}/api/auth/signup`, {
            email,
            password,
            displayName
          });
          const { token: newToken, user: newUser } = signupResponse.data;
          localStorage.setItem('token', newToken);
          setToken(newToken);
          setUser(newUser);
          router.push('/dashboard');
        } catch (signupError: any) {
          throw new Error(signupError.response?.data?.error || 'Signup failed');
        }
      } else {
        throw new Error(loginError.response?.data?.error || 'Login failed');
      }
    }
  };

  const loginWithGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid email profile`;
    window.location.href = authUrl;
  };

  const loginWithKeyless = async () => {
    try {
      // Trigger Aptos keyless flow
      const response = await axios.post(`${API_URL}/api/auth/keyless/initiate`);
      const { authUrl } = response.data;
      window.location.href = authUrl;
    } catch (error) {
      throw new Error('Keyless login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        loginWithKeyless,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
