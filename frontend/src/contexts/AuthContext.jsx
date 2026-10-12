import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_BASE = '/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(response=>response,error=>{if(error.response?.status===401&&error.config?.url!=='/auth/login'){localStorage.removeItem('token');}return Promise.reject(error);});
function validateIdentity(value,email){if(typeof value?.token!=='string'||!value.token||!value.user||!Number.isSafeInteger(Number(value.user.id))||value.user.email?.toLowerCase()!==email.trim().toLowerCase())throw Error('Native sign-in returned an invalid account.');let claims;try{claims=JSON.parse(atob(value.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch(_){throw Error('Native sign-in returned a malformed token.');}if(Number(claims.id)!==Number(value.user.id)||claims.email!==value.user.email||claims.role!==value.user.role)throw Error('The sign-in token does not match the account.');}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    validateIdentity(res.data,email);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
