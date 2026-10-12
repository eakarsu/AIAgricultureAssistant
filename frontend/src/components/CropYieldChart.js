import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../contexts/AuthContext';

const PALETTE = [
  '#2e7d32', '#1e88e5', '#fb8c00', '#8e24aa', '#d81b60',
  '#00897b', '#5e35b1', '#c0ca33', '#6d4c41', '#3949ab'
];

export default function CropYieldChart() {
  const [data, setData] = useState({ seasons: [], fields: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load=useCallback(async()=>{setLoading(true);setError('');try{const result=await api.get('/custom-views/yield-trends');if(!Array.isArray(result.data.seasons)||!Array.isArray(result.data.fields))throw Error('Native yield data has an unexpected response.');setData(result.data);}catch(error){setError(error.response?.data?.error||error.message||'Yield data is unavailable. Retry.');}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);

  const lines = useMemo(() => {
    return (data.fields || []).map((f, i) => (
      <Line
        key={f}
        type="monotone"
        dataKey={f}
        stroke={PALETTE[i % PALETTE.length]}
        strokeWidth={2}
        dot={{ r: 3 }}
        connectNulls
      />
    ));
  }, [data.fields]);

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Crop Yield Trends (per field, per season)</h3>
      {loading && <div>Loading yield trends...</div>}
      {error && <div role="alert" style={{ color: '#c62828' }}>Error: {error}<button type="button" onClick={load}>Retry</button></div>}
      {!loading && !error && (data.seasons || []).length === 0 && (
        <div>No non-empty yield predictions are available. Fictional planning drafts with unknown yields are excluded rather than charted as zero.</div>
      )}
      {!loading && !error && (data.seasons || []).length > 0 && (
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.seasons} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Yield', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
