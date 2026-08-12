'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Users, ArrowRight, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface CircularRing {
  id: string;
  title: string;
  riskScore: number;
  hopCount: number;
  totalVolume: number;
  accounts: string[];
  amounts: number[];
  description: string;
}

interface SyntheticIdentity {
  id: string;
  customer1: string;
  customer2: string;
  sharedType: string;
  sharedDetail: string;
  riskScore: number;
  acc1: string;
  acc2: string;
}

interface FraudRingInspectorProps {
  onHighlightLoop: (accounts: string[]) => void;
  activeHighlight: string[];
}

export function FraudRingInspector({ onHighlightLoop, activeHighlight }: FraudRingInspectorProps) {
  const [rings, setRings] = useState<CircularRing[]>([]);
  const [synIdentities, setSynIdentities] = useState<SyntheticIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'CIRCULAR' | 'SYNTHETIC'>('CIRCULAR');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph/fraud-rings');
      const data = await res.json();
      setRings(data.circularRings ?? []);
      setSynIdentities(data.syntheticIdentities ?? []);
    } catch {
      // noop - API falls back gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); }
  }, []);

  const isRingActive = (accounts: string[]) =>
    activeHighlight.length > 0 && accounts.every((a) => activeHighlight.includes(a));

  return (
    <div className="bg-[#080C15] rounded-xl border border-white/[0.07] flex flex-col h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-slate-200">Graph Ring Detector</span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-slate-600 hover:text-slate-300 p-1 rounded transition-colors"
          title="Re-run detection"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {([['CIRCULAR', `Layering Loops (${rings.length})`], ['SYNTHETIC', `Synthetic IDs (${synIdentities.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-[11px] font-semibold transition-all border-b-2 ${
              tab === id
                ? id === 'CIRCULAR'
                  ? 'border-red-500 text-red-400 bg-red-500/5'
                  : 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-red-400 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-600 font-mono">Running Cypher pattern match…</span>
          </div>
        ) : tab === 'CIRCULAR' ? (
          rings.length === 0 ? (
            <Empty text="No circular loops found in current graph." />
          ) : (
            rings.map((ring) => {
              const active = isRingActive(ring.accounts);
              const expanded = expandedId === ring.id;
              return (
                <div
                  key={ring.id}
                  className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                    active
                      ? 'border-red-500/50 bg-red-500/5'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : ring.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-red-400 animate-pulse' : 'bg-red-500/60'}`} />
                        <span className="text-[11px] font-semibold text-slate-200 leading-tight truncate">
                          {ring.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <RiskBadge score={ring.riskScore} />
                        {expanded ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{ring.description}</p>
                  </div>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.05] pt-2 animate-fade-in">
                      {/* Hop trail */}
                      <div className="flex flex-wrap items-center gap-1 p-2 bg-black/30 rounded-lg font-mono text-[10px]">
                        {ring.accounts.map((acc, i) => (
                          <React.Fragment key={i}>
                            <span className="text-amber-300 font-semibold">{acc}</span>
                            {i < ring.accounts.length - 1 && <ArrowRight className="w-3 h-3 text-slate-700" />}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Amounts */}
                      <div className="flex flex-wrap gap-1">
                        {ring.amounts.map((amt, i) => (
                          <span key={i} className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            ${Number(amt).toLocaleString()}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-600">
                          Total: <span className="text-emerald-400 font-mono font-semibold">${ring.totalVolume.toLocaleString()}</span>
                        </span>
                        <button
                          onClick={() => onHighlightLoop(active ? [] : ring.accounts)}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                            active
                              ? 'bg-red-600 text-white'
                              : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300'
                          }`}
                        >
                          {active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {active ? 'Clear' : 'Highlight'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          synIdentities.length === 0 ? (
            <Empty text="No synthetic identity clusters detected." />
          ) : (
            synIdentities.map((syn) => {
              const accounts = [syn.acc1, syn.acc2];
              const active = isRingActive(accounts);
              const expanded = expandedId === syn.id;
              return (
                <div
                  key={syn.id}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    active ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="p-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : syn.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-200 truncate">
                          {syn.customer1} ↔ {syn.customer2}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <RiskBadge score={syn.riskScore} />
                        {expanded ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">Shared: <span className="text-indigo-400">{syn.sharedType}</span></p>
                  </div>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.05] pt-2 animate-fade-in">
                      <div className="p-2 bg-black/30 rounded-lg font-mono text-[10px] text-slate-400">{syn.sharedDetail}</div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">
                          <span className="text-amber-300 font-mono">{syn.acc1}</span> ↔ <span className="text-amber-300 font-mono">{syn.acc2}</span>
                        </span>
                        <button
                          onClick={() => onHighlightLoop(active ? [] : accounts)}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                            active ? 'bg-indigo-600 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300'
                          }`}
                        >
                          {active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {active ? 'Clear' : 'Highlight'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-red-400 bg-red-500/10 border-red-500/25'
    : score >= 75 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  return (
    <span className={`text-[10px] font-mono font-bold border px-1.5 py-0.5 rounded ${color}`}>
      {score}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <AlertTriangle className="w-6 h-6 text-slate-700" />
      <span className="text-[11px] text-slate-600">{text}</span>
    </div>
  );
}
