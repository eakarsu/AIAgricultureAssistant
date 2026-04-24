import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useApi() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, url, data = null, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const config = { method, url, ...options };
      if (data) config.data = data;
      const res = await api(config);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const get = useCallback((url, params) => request('get', url, null, { params }), [request]);
  const post = useCallback((url, data) => request('post', url, data), [request]);
  const put = useCallback((url, data) => request('put', url, data), [request]);
  const del = useCallback((url) => request('delete', url), [request]);

  return { loading, error, get, post, put, del, request };
}
