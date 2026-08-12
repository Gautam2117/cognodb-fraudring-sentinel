'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Database, AlertTriangle, RefreshCw, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';

interface Status {
  connected: boolean;
  uri?: string;
  latencyMs?: number;
  error?: string;
  isMockFallback?: boolean;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(true);
  const fetchedRef = useRef(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      const data: Status = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, isMockFallback: true, error: 'Health check unreachable' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; check(); }
  }, []);

  if (checking && !status) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">Connecting…</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <Wifi className="w-3 h-3" />
        <span className="hidden sm:inline">CognoDB · {status.latencyMs}ms</span>
        <span className="sm:hidden">Live</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 cursor-pointer hover:bg-amber-500/15 transition-colors"
      onClick={check}
      title="Click to retry CognoDB connection"
    >
      <WifiOff className="w-3 h-3" />
      <span className="hidden sm:inline">Demo Mode</span>
      <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
    </div>
  );
}
