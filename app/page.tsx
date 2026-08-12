'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { GraphCanvas } from '@/components/GraphCanvas';
import { FraudRingInspector } from '@/components/FraudRingInspector';
import { CypherPlayground } from '@/components/CypherPlayground';
import { PathFinderModal } from '@/components/PathFinderModal';
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram';
import { GraphData } from '@/lib/queries';
import {
  ShieldAlert,
  Network,
  Code,
  Database,
  GitBranch,
  Layers,
  Activity,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';

// Animated counter hook
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

type Tab = 'CANVAS' | 'CYPHER' | 'ARCHITECTURE';
type SeedStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Dashboard() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [highlightAccounts, setHighlightAccounts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('CANVAS');
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('idle');
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const fetchedOnce = useRef(false);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.data) {
        setGraphData(json.data);
        setIsMockMode(json.source === 'mock');
      }
    } catch (e) {
      console.error('Failed to fetch graph data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTriggerSeed = async () => {
    setSeedStatus('loading');
    setSeedMessage(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSeedStatus('success');
        setSeedMessage('Database seeded successfully. Graph refreshed with live data.');
        fetchGraph();
      } else {
        setSeedStatus('error');
        setSeedMessage(json.message || json.error || 'Seed failed. Confirm .env.local credentials are set.');
      }
    } catch {
      setSeedStatus('error');
      setSeedMessage('Seed request failed. Check server logs.');
    } finally {
      setTimeout(() => setSeedStatus('idle'), 4000);
    }
  };

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchGraph();
    }
  }, [fetchGraph]);

  const accountIds = graphData.nodes
    .filter((n) => n.type === 'Account')
    .map((n) => n.id);

  const flaggedCount = graphData.nodes.filter(
    (n) => n.status === 'FLAGGED' || (n.riskScore && n.riskScore > 85)
  ).length;

  const ringCount = 2; // Derived from known seed data; live: fetched from fraud-rings API

  const animatedNodes = useCountUp(graphData.nodes.length);
  const animatedEdges = useCountUp(graphData.edges.length);
  const animatedFlagged = useCountUp(flaggedCount);

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'CANVAS', icon: <Network className="w-4 h-4" />, label: 'Graph Canvas' },
    { id: 'CYPHER', icon: <Code className="w-4 h-4" />, label: 'Cypher Console' },
    { id: 'ARCHITECTURE', icon: <Layers className="w-4 h-4" />, label: 'Graph vs SQL' },
  ];

  return (
    <div className="min-h-screen bg-[#060912] text-slate-100 flex flex-col font-sans">
      {/* ── Navbar ── */}
      <header className="border-b border-white/[0.06] bg-[#060912]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-5 h-[60px] flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldAlert className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap">FraudRing Sentinel</span>
                <span className="text-[9px] uppercase tracking-widest font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                  CognoDB · openCypher
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">Financial Crime Graph Intelligence</p>
            </div>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ConnectionStatus />
            <button
              id="seed-db-button"
              onClick={handleTriggerSeed}
              disabled={seedStatus === 'loading'}
              className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.14] text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 text-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {seedStatus === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="hidden sm:inline">
                {seedStatus === 'loading' ? 'Seeding…' : 'Seed CognoDB'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Demo Mode Banner ── */}
      {isMockMode && (
        <div className="border-b border-white/[0.04] bg-[#060912] px-5 py-1.5 text-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 flex-shrink-0" />
            Demo mode active. No CognoDB credentials in .env.local. Showing pre-seeded mock data.
          </span>
        </div>
      )}

      {/* ── Seed Notification ── */}
      {seedMessage && (
        <div className={`mx-5 mt-4 flex items-center gap-3 p-3 rounded-xl text-xs font-medium border ${
          seedStatus === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {seedStatus === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{seedMessage}</span>
          <button onClick={() => setSeedMessage(null)} className="text-current opacity-60 hover:opacity-100 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-5 py-5 space-y-5">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Graph Nodes',
              value: animatedNodes,
              suffix: '',
              icon: <Network className="w-4 h-4" />,
              color: 'indigo',
              detail: 'Accounts, Customers, Devices, Merchants',
            },
            {
              label: 'Relationships',
              value: animatedEdges,
              suffix: '',
              icon: <GitBranch className="w-4 h-4" />,
              color: 'violet',
              detail: 'TRANSFERRED, OWNS, USED_DEVICE, PAYS',
            },
            {
              label: 'Flagged Nodes',
              value: animatedFlagged,
              suffix: '',
              icon: <ShieldAlert className="w-4 h-4" />,
              color: 'red',
              detail: 'Risk score > 85 or status = FLAGGED',
            },
            {
              label: 'Laundering Rings',
              value: ringCount,
              suffix: ' detected',
              icon: <Activity className="w-4 h-4" />,
              color: 'amber',
              detail: '3–6 hop circular layering loops',
            },
          ].map(({ label, value, suffix, icon, color, detail }) => {
            const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
              indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: 'text-indigo-400', text: 'text-indigo-300' },
              violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400', text: 'text-violet-300' },
              red: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400', text: 'text-red-300' },
              amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', text: 'text-amber-300' },
            };
            const c = colorMap[color];
            return (
              <div key={label} className={`group relative overflow-hidden rounded-xl border bg-[#0B0F1A] ${c.border} p-4 flex flex-col gap-2 hover:bg-[#0F1525] transition-all duration-200`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</span>
                  <span className={`${c.bg} ${c.border} border rounded-lg p-1.5 ${c.icon}`}>{icon}</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${c.text}`}>
                  {value}{suffix}
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">{detail}</p>
                {/* Subtle glow accent */}
                <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full ${c.bg} blur-2xl opacity-60`} />
              </div>
            );
          })}
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] p-1 rounded-xl">
            {tabs.map(({ id, icon, label }) => (
              <button
                key={id}
                id={`tab-${id.toLowerCase()}`}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {highlightAccounts.length > 0 && (
            <button
              onClick={() => setHighlightAccounts([])}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <X className="w-3 h-3" />
              Clear Highlight ({highlightAccounts.length} nodes)
            </button>
          )}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'CANVAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <GraphCanvas
                data={graphData}
                highlightAccounts={highlightAccounts}
                onRefresh={fetchGraph}
                loading={loading}
              />
              <PathFinderModal
                accounts={accountIds}
                onSelectPath={(pathNodes) => setHighlightAccounts(pathNodes)}
              />
            </div>
            <div className="lg:col-span-1">
              <FraudRingInspector
                onHighlightLoop={(accs) => setHighlightAccounts(accs)}
                activeHighlight={highlightAccounts}
              />
            </div>
          </div>
        )}

        {activeTab === 'CYPHER' && <CypherPlayground />}
        {activeTab === 'ARCHITECTURE' && <ArchitectureDiagram />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] bg-[#050810] py-4 px-5">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
          <span>FraudRing Sentinel · Wexa AI Assessment · CognoDB Cloud (openCypher via Neo4j Bolt Driver 5.x)</span>
          <span className="flex items-center gap-1">
            Built with Next.js 14 · Vis.js · TypeScript
          </span>
        </div>
      </footer>
    </div>
  );
}
