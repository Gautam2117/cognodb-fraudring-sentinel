'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import type { Options } from 'vis-network/standalone';
import { GraphData, GraphNode } from '@/lib/queries';
import { Maximize2, ZoomIn, ZoomOut, RefreshCw, Filter, X } from 'lucide-react';

interface GraphCanvasProps {
  data: GraphData;
  highlightAccounts?: string[];
  onRefresh?: () => void;
  loading?: boolean;
}

// Node appearance config per type + risk
function getNodeStyle(n: GraphNode, isHighlighted: boolean) {
  let baseColor = '#6366F1';
  let shape: string = 'dot';
  let size = 20;

  if (n.type === 'Account') {
    shape = 'diamond';
    size = 24;
    const risk = n.riskScore ?? 0;
    if (n.status === 'FLAGGED' || risk > 85) baseColor = '#EF4444';
    else if (n.status === 'SUSPICIOUS' || risk > 65) baseColor = '#F59E0B';
    else baseColor = '#10B981';
  } else if (n.type === 'Customer') {
    shape = 'dot';
    baseColor = '#818CF8';
  } else if (n.type === 'Device') {
    shape = 'square';
    baseColor = n.properties?.isFlagged ? '#DC2626' : '#A78BFA';
    size = 16;
  } else if (n.type === 'Merchant') {
    shape = 'triangle';
    baseColor = '#F472B6';
    size = 18;
  }

  const bg = isHighlighted ? '#F43F5E' : baseColor;

  return {
    shape,
    size: isHighlighted ? size * 1.4 : size,
    color: {
      background: bg,
      border: isHighlighted ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
      highlight: { background: '#F43F5E', border: '#FFF' },
      hover: { background: bg, border: 'rgba(255,255,255,0.5)' },
    },
    font: {
      color: '#CBD5E1',
      size: 11,
      face: 'Inter, sans-serif',
      strokeWidth: 3,
      strokeColor: 'rgba(6,9,18,0.9)',
    },
    borderWidth: isHighlighted ? 3 : 1,
    shadow: {
      enabled: true,
      color: isHighlighted ? 'rgba(244,63,94,0.5)' : 'rgba(0,0,0,0.6)',
      size: isHighlighted ? 18 : 8,
    },
  };
}

export function GraphCanvas({ data, highlightAccounts = [], onRefresh, loading = false }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isStabilized, setIsStabilized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    setIsStabilized(false);

    const filteredNodes = data.nodes.filter((n) => filterType === 'ALL' || n.type === filterType);
    const validIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter((e) => validIds.has(e.from) && validIds.has(e.to));

    const visNodes = filteredNodes.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      title: `<b style="font-family:JetBrains Mono;font-size:12px">${n.type}: ${n.id}</b><br/>Risk: ${n.riskScore ?? 'N/A'}`,
      ...getNodeStyle(n, highlightAccounts.includes(n.id)),
    }));

    const visEdges = filteredEdges.map((e) => {
      const isHighlighted = highlightAccounts.includes(e.from) && highlightAccounts.includes(e.to);
      let edgeColor = '#334155';
      let width = 1.5;
      let edgeLabel = '';

      if (e.type === 'TRANSFERRED') {
        edgeColor = isHighlighted ? '#F43F5E' : '#6366F1';
        width = isHighlighted ? 3.5 : 2;
        if (e.properties?.amount) {
          edgeLabel = `$${Number(e.properties.amount).toLocaleString()}`;
        }
      } else if (e.type === 'OWNS') {
        edgeColor = '#64748B';
        width = 1;
      } else if (e.type === 'USED_DEVICE' || e.type === 'SHARES_PII') {
        edgeColor = '#EF4444';
        width = 2;
        edgeLabel = e.type === 'SHARES_PII' ? 'SHARES PII' : 'DEVICE';
      } else if (e.type === 'PAID') {
        edgeColor = '#EC4899';
        width = 1.5;
      }

      return {
        id: e.id,
        from: e.from,
        to: e.to,
        label: edgeLabel,
        title: e.type + (e.properties?.amount ? ` · $${Number(e.properties.amount).toLocaleString()}` : ''),
        arrows: { to: { enabled: true, scaleFactor: 0.5, type: 'arrow' } },
        color: { color: edgeColor, highlight: '#F43F5E', hover: 'rgba(255,255,255,0.4)' },
        width,
        font: { color: '#64748B', size: 9, face: 'JetBrains Mono', strokeWidth: 2, strokeColor: 'rgba(6,9,18,0.95)' },
        smooth: { enabled: true, type: e.type === 'TRANSFERRED' ? 'dynamic' : 'continuous', roundness: 0.2 },
        dashes: e.type === 'SHARES_PII',
      };
    });

    const options: Options = {
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          theta: 0.5,
          gravitationalConstant: -55,
          centralGravity: 0.008,
          springLength: 130,
          springConstant: 0.06,
          damping: 0.4,
        },
        stabilization: { enabled: true, iterations: 200, fit: true },
      },
      interaction: {
        hover: true,
        tooltipDelay: 80,
        zoomView: true,
        dragView: true,
        dragNodes: true,
        navigationButtons: false,
        keyboard: false,
      },
      nodes: { borderWidthSelected: 3 },
      edges: { selectionWidth: 2.5 },
    };

    if (networkRef.current) networkRef.current.destroy();
    const net = new Network(
      containerRef.current,
      { nodes: new DataSet(visNodes), edges: new DataSet(visEdges) },
      options
    );
    networkRef.current = net;

    net.on('stabilized', () => setIsStabilized(true));
    net.on('click', ({ nodes: clickedNodes }) => {
      if (clickedNodes.length > 0) {
        const found = data.nodes.find((n) => n.id === clickedNodes[0]) ?? null;
        setSelectedNode(found);
      } else {
        setSelectedNode(null);
      }
    });

    return () => { net.destroy(); };
  }, [data, filterType, highlightAccounts]);

  const zoom = (dir: 1 | -1) => {
    if (!networkRef.current) return;
    networkRef.current.moveTo({ scale: networkRef.current.getScale() * (dir > 0 ? 1.25 : 0.8) });
  };

  const fit = () => networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });

  // Legend items
  const legend = [
    { color: '#EF4444', label: 'Flagged Account' },
    { color: '#F59E0B', label: 'Suspicious Account' },
    { color: '#10B981', label: 'Clean Account' },
    { color: '#818CF8', label: 'Customer' },
    { color: '#A78BFA', label: 'Device' },
    { color: '#F472B6', label: 'Merchant' },
    { color: '#F43F5E', shape: 'highlighted', label: 'Active Highlight' },
  ];

  return (
    <div className="relative w-full h-[580px] bg-[#070B14] rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Loading overlay */}
      {(loading || !isStabilized) && (
        <div className="absolute inset-0 z-30 bg-[#070B14]/80 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono">
            {loading ? 'Fetching graph from CognoDB…' : 'Stabilizing physics layout…'}
          </span>
        </div>
      )}

      {/* Top-left: Filter */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#0B0F1A]/90 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/[0.07] shadow-xl">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-transparent text-[11px] text-slate-300 border-none outline-none cursor-pointer"
        >
          <option value="ALL">All ({data.nodes.length})</option>
          <option value="Account">Accounts</option>
          <option value="Customer">Customers</option>
          <option value="Device">Devices</option>
          <option value="Merchant">Merchants</option>
        </select>
      </div>

      {/* Top-right: Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#0B0F1A]/90 backdrop-blur-md p-1 rounded-lg border border-white/[0.07] shadow-xl">
        <button onClick={() => zoom(1)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
        <button onClick={() => zoom(-1)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={fit} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title="Fit all"><Maximize2 className="w-3.5 h-3.5" /></button>
        {onRefresh && (
          <>
            <div className="w-px h-3.5 bg-white/10 mx-0.5" />
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40"
              title="Refresh graph"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom-left: Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 bg-[#0B0F1A]/90 backdrop-blur-md px-2.5 py-2 rounded-lg border border-white/[0.07] max-w-xs">
        {legend.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Node Inspector panel */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 z-20 w-72 bg-[#0B0F1A]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    selectedNode.status === 'FLAGGED' ? '#EF4444'
                    : selectedNode.type === 'Customer' ? '#818CF8'
                    : selectedNode.type === 'Device' ? '#A78BFA'
                    : '#10B981',
                }}
              />
              <span className="text-xs font-semibold text-white font-mono">{selectedNode.id}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-slate-600 hover:text-slate-300 p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-4 py-3 space-y-1.5 max-h-52 overflow-y-auto">
            <Row label="type" value={selectedNode.type} accent />
            {selectedNode.riskScore != null && (
              <Row
                label="riskScore"
                value={`${selectedNode.riskScore} / 100`}
                valueClass={selectedNode.riskScore > 80 ? 'text-red-400' : selectedNode.riskScore > 60 ? 'text-amber-400' : 'text-emerald-400'}
              />
            )}
            {selectedNode.status && <Row label="status" value={selectedNode.status} />}
            {Object.entries(selectedNode.properties)
              .filter(([k]) => !['riskScore', 'status'].includes(k))
              .map(([k, v]) => (
                <Row key={k} label={k} value={String(v)} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent, valueClass }: { label: string; value: string; accent?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 text-[11px]">
      <span className="text-slate-600 font-mono flex-shrink-0">{label}</span>
      <span className={`font-mono text-right break-all ${valueClass ?? (accent ? 'text-indigo-300' : 'text-slate-300')}`}>{value}</span>
    </div>
  );
}
