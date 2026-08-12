'use client';

import React, { useState } from 'react';
import { Search, ArrowRight, GitMerge, Info, Loader2 } from 'lucide-react';

interface PathFinderModalProps {
  accounts: string[];
  onSelectPath: (nodes: string[]) => void;
}

export function PathFinderModal({ accounts, onSelectPath }: PathFinderModalProps) {
  const [src, setSrc] = useState(accounts[0] ?? 'ACC-101');
  const [dst, setDst] = useState(accounts[3] ?? 'ACC-104');
  const [result, setResult] = useState<{ found: boolean; hopCount?: number; nodes?: string[]; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate defaults when accounts list arrives
  React.useEffect(() => {
    if (accounts.length >= 4) {
      setSrc(accounts[0]);
      setDst(accounts[3]);
    }
  }, [accounts]);

  const handleFind = async () => {
    if (src === dst) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/graph/path-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAcc: src, targetAcc: dst }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Path search failed');
      setResult(data);
      if (data.nodes) onSelectPath(data.nodes);
    } catch (err: any) {
      setError(err?.message ?? 'Error calculating path');
    } finally {
      setLoading(false);
    }
  };

  const SelectStyle = 'w-full bg-[#0B0F1A] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-indigo-500/50 transition-colors';

  return (
    <div className="bg-[#080C15] rounded-xl border border-white/[0.07] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <GitMerge className="w-4 h-4 text-indigo-400" />
        <div>
          <span className="text-xs font-semibold text-slate-200">Multi-Hop Path Finder</span>
          <p className="text-[10px] text-slate-600">Uses Cypher <code className="font-mono text-indigo-400">shortestPath()</code> · up to 8 hops</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-600 font-mono mb-1.5">Source Account</label>
            <select value={src} onChange={(e) => setSrc(e.target.value)} className={SelectStyle}>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-600 font-mono mb-1.5">Target Account</label>
            <select value={dst} onChange={(e) => setDst(e.target.value)} className={SelectStyle}>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {src === dst && (
          <p className="text-[10px] text-amber-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Source and target must be different accounts.
          </p>
        )}

        <button
          onClick={handleFind}
          disabled={loading || src === dst || accounts.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {loading ? 'Executing shortestPath()…' : 'Trace Money Flow'}
        </button>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-mono">
            {error}
          </div>
        )}

        {result?.found && result.nodes && (
          <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-2 animate-slide-up">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-indigo-400 font-semibold">Path Found</span>
              <span className="font-mono text-slate-500">{result.hopCount} hop{result.hopCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 p-2 bg-black/30 rounded-lg font-mono text-[10px]">
              {result.nodes.map((node: string, i: number) => (
                <React.Fragment key={i}>
                  <span className="text-amber-300 font-semibold">{node}</span>
                  {i < (result.nodes as string[]).length - 1 && <ArrowRight className="w-3 h-3 text-slate-700" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-slate-600">Highlighted in graph canvas above.</p>
          </div>
        )}

        {result && !result.found && (
          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/[0.06] text-[11px] text-slate-500 font-mono">
            {result.message ?? 'No connected path found within 8 hops.'}
          </div>
        )}
      </div>
    </div>
  );
}
