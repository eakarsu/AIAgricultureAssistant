import { useCallback, useEffect, useRef, useState } from 'react';
export default function useFarmFields(api) {
  const [fields, setFields] = useState([]), [fieldsLoading, setFieldsLoading] = useState(true), [fieldsError, setFieldsError] = useState('');
  const current = useRef(null);
  const loadFields = useCallback(async () => {
    current.current?.abort(); const controller = new AbortController(); current.current = controller;
    setFieldsLoading(true); setFieldsError('');
    try {
      const response = await api.get('/fields', { params: { limit: 100 }, signal: controller.signal });
      const rows = Array.isArray(response.data) ? response.data : response.data.records ?? response.data.data;
      if (!Array.isArray(rows) || rows.some(row => !row || !Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0)) throw new Error('Farm fields returned an unexpected response. Retry before selecting a source.');
      if (!controller.signal.aborted) setFields(rows);
    } catch (error) { if (!controller.signal.aborted) setFieldsError(error.response?.data?.error || error.message || 'Your accessible farm fields could not be loaded'); }
    finally { if (!controller.signal.aborted && current.current === controller) { current.current = null; setFieldsLoading(false); } }
  }, [api]);
  useEffect(() => { void loadFields(); return () => current.current?.abort(); }, [loadFields]);
  return { fields, fieldsLoading, fieldsError, loadFields };
}
