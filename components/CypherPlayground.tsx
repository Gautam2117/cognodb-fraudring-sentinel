'use client';

import React, { useState } from 'react';
import { Play, Copy, Check, Clock, Table2, Braces, ChevronRight, AlertCircle } from 'lucide-react';
import { CYPHER_QUERIES } from '@/lib/queries';

interface Preset {
  name: string;
  description: string;
  tag: string;
  tagColor: string;
  query: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Circular Layering Detection',
    description: 'Find all circular money movement loops of 3–6 hops where every transfer exceeds $2,500.',
    tag: '3–6 hops',
    tagColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    query: CYPHER_QUERIES.DETECT_CIRCULAR_LOOPS,
  },
  {
    name: 'Synthetic Identity Clusters',
    description: 'Detect customers sharing a physical device or PII identifier (SSN, phone).',
    tag: 'AML Pattern',
    tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    query: CYPHER_QUERIES.DETECT_SYNTHETIC_IDENTITIES,
  },
  {
    name: 'Hub Centrality & Mule Accounts',
    description: 'Rank accounts by total transaction volume (inbound + outbound) to find hub nodes.',
    tag: 'Centrality',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    query: CYPHER_QUERIES.GET_HIGH_RISK_HUBS,
  },
  {
    name: 'Full Graph View',
    description: 'Return all nodes and relationships for the visual graph canvas (limit 250).',
    tag: 'Graph Fetch',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    query: CYPHER_QUERIES.FETCH_GRAPH,
  },
];

export function CypherPlayground() {
  const [activePreset, setActivePreset] = useState(0);
  const [queryText, setQueryText] = useState(PRESETS[0].query);
  const [results, setResults] = useState<Record<string, any>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'TABLE' | 'JSON'>('TABLE');
  const [execMs, setExecMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePreset = (idx: number) => {
    setActivePreset(idx);
    setQueryText(PRESETS[idx].query);
    setResults(null);
    setError(null);
    setExecMs(null);
  };

  const handleRun = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const res = await fetch('/api/graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - t0);
      setExecMs(elapsed);

      if (!res.ok || data.error) throw new Error(data.error ?? 'Cypher execution failed');

      // Normalize results: plain records, or node list from graph fetch
      const recs: Record<string, any>[] = data.records ?? (data.data?.nodes ? data.data.nodes : []);
      setResults(recs);
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(queryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const columns = results && results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div className="bg-[#080C15] rounded-xl border border-white/[0.07] flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">openCypher Query Console</h3>
          <p className="text-[10px] text-slate-600 mt-0.5">Parameterized queries via Neo4j Bolt Driver 5.x · CognoDB Cloud</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[520px]">
        {/* ── Left sidebar: Presets ── */}
        <div className="lg:col-span-1 border-r border-white/[0.06] p-3 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-700 font-semibold px-2 pb-1">Presets</p>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(idx)}
              className={`w-full text-left p-2.5 rounded-lg transition-all duration-150 ${
                activePreset === idx
                  ? 'bg-indigo-600/20 border border-indigo-500/30'
                  : 'hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className={`text-[11px] font-semibold leading-tight ${activePreset === idx ? 'text-indigo-300' : 'text-slate-400'}`}>
                  {preset.name}
                </span>
                {activePreset === idx && <ChevronRight className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />}
              </div>
              <span className={`inline-block text-[9px] font-mono font-semibold uppercase border px-1 py-0.5 rounded ${preset.tagColor}`}>
                {preset.tag}
              </span>
            </button>
          ))}

          {/* Preset description */}
          <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <p className="text-[10px] text-slate-600 leading-relaxed">{PRESETS[activePreset].description}</p>
          </div>
        </div>

        {/* ── Right: Editor + Results ── */}
        <div className="lg:col-span-3 flex flex-col">
          {/* Editor */}
          <div className="relative flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/50" />
                <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
                <span className="ml-2 text-[10px] text-slate-700 font-mono">cypher · parameterized · read-only safety on</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 ${loading ? 'animate-pulse' : ''}`} />
                  {loading ? 'Running…' : 'Run Query'}
                </button>
              </div>
            </div>

            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              rows={8}
              className="cypher-editor w-full bg-[#050810] text-emerald-400 px-4 py-3 border-b border-white/[0.05] focus:outline-none"
              spellCheck={false}
              placeholder="MATCH (n:Account) RETURN n LIMIT 10"
            />
          </div>

          {/* Results area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Results toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/10 border-b border-white/[0.04]">
              <div className="flex items-center gap-3 text-[11px]">
                {execMs !== null && !error && (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <Clock className="w-3 h-3" /> {execMs}ms
                  </span>
                )}
                {results && (
                  <span className="text-slate-600 font-mono">{results.length} row{results.length !== 1 ? 's' : ''}</span>
                )}
                {error && (
                  <span className="flex items-center gap-1 text-red-400 font-mono">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </span>
                )}
              </div>
              {results && results.length > 0 && (
                <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode('TABLE')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'TABLE' ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                    title="Table view"
                  ><Table2 className="w-3.5 h-3.5" /></button>
                  <button
                    onClick={() => setViewMode('JSON')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'JSON' ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                    title="JSON view"
                  ><Braces className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {/* Results body */}
            <div className="flex-1 overflow-auto">
              {!results && !error && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                  <span className="text-[11px] text-slate-700 font-mono leading-relaxed">
                    Select a preset or write a Cypher query, then press Run to execute against CognoDB.
                  </span>
                </div>
              )}

              {results && results.length === 0 && (
                <div className="flex items-center justify-center h-32 text-[11px] text-slate-700 font-mono">
                  Query returned 0 records.
                </div>
              )}

              {results && results.length > 0 && viewMode === 'TABLE' && (
                <table className="w-full text-[11px] font-mono border-collapse">
                  <thead className="sticky top-0 bg-[#0B0F1A] z-10">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="text-left px-4 py-2 text-slate-600 font-semibold border-b border-white/[0.05] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        {columns.map((col) => (
                          <td key={col} className="px-4 py-2 text-slate-300 max-w-[220px] truncate" title={JSON.stringify(row[col])}>
                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {results && results.length > 0 && viewMode === 'JSON' && (
                <pre className="p-4 text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
