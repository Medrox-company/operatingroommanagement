import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const DebugComponent: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const debug = async () => {
      const logs: string[] = [];
      
      logs.push('[v0] Debug started');
      logs.push(`[v0] Supabase URL: ${import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...`);
      logs.push(`[v0] Supabase Key exists: ${!!import.meta.env.VITE_SUPABASE_ANON_KEY}`);
      
      try {
        const { data, error } = await supabase
          .from('operating_rooms')
          .select('count(*)');
        
        if (error) {
          logs.push(`[v0] Database error: ${error.message}`);
        } else {
          logs.push(`[v0] Database connected successfully`);
          logs.push(`[v0] Operating rooms count: ${data}`);
        }
      } catch (err) {
        logs.push(`[v0] Exception: ${String(err)}`);
      }
      
      setDebugInfo(logs);
    };

    debug();
  }, []);

  return (
    <div className="p-4 bg-black text-white min-h-screen">
      <h1 className="text-2xl mb-4">Debug Info</h1>
      <pre className="bg-gray-900 p-4 rounded overflow-auto">
        {debugInfo.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </pre>
    </div>
  );
};
