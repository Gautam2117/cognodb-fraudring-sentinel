'use client';

import React from 'react';
import { Database, Zap, AlertTriangle, Check, X } from 'lucide-react';

const SQL_EXAMPLE = `-- PostgreSQL: Find circular money loops (3–6 hops)
-- Requires a recursive CTE with exponential join cost
WITH RECURSIVE layering_cte AS (
  SELECT
    from_acc, to_acc, amount, 1 AS depth,
    ARRAY[from_acc] AS visited_path
  FROM transactions
  WHERE amount >= 2500
  
  UNION ALL
  
  SELECT
    t.from_acc, t.to_acc, t.amount,
    cte.depth + 1,
    cte.visited_path || t.from_acc
  FROM transactions t
  JOIN layering_cte cte ON t.from_acc = cte.to_acc
  WHERE cte.depth < 6
    AND NOT (t.from_acc = ANY(cte.visited_path))
    AND t.amount >= 2500
)
SELECT *
FROM layering_cte
WHERE to_acc = visited_path[1]   -- circular loop match
  AND depth BETWEEN 3 AND 6
ORDER BY array_length(visited_path, 1);

-- Performance Bottleneck: 6-way self-join on 10M transaction rows.
-- Scanning billions of intermediate paths frequently causes timeouts.`;

const CYPHER_EXAMPLE = `// CognoDB openCypher: Same query, index-free adjacency
// Pointer traversal: O(1) per hop regardless of total database size
MATCH path = (a:Account)-[r:TRANSFERRED*3..6]->(a)
WHERE ALL(rel IN relationships(path)
      WHERE rel.amount >= 2500)
WITH
  path,
  [n IN nodes(path) | n.accountNo]  AS ring,
  [r IN relationships(path) | r.amount] AS amounts,
  reduce(tot=0, r IN relationships(path) | tot + r.amount) AS volume
RETURN ring, amounts, volume, length(path) AS hops
ORDER BY volume DESC
LIMIT 10

// Execution Advantage: Evaluates in constant time via memory pointers.
// Scale behavior: Adding 10M transactions does not degrade latency.`;

interface ComparisonRow {
  feature: string;
  sql: string;
  graph: string;
}

const COMPARISON: ComparisonRow[] = [
  {
    feature: 'Multi-hop traversal (3–6 hops)',
    sql: 'Recursive CTEs with exponential self-joins',
    graph: 'Native pattern match in a single MATCH clause',
  },
  {
    feature: 'Traversal time complexity',
    sql: 'O(N^k) - degrades rapidly with hop depth',
    graph: 'O(1) per hop via index-free adjacency pointers',
  },
  {
    feature: 'Circular loop detection',
    sql: 'Requires cycle-breaking guard arrays, high timeout risk',
    graph: 'Built-in: (a)-[*3..6]->(a) matches rings natively',
  },
  {
    feature: 'Shared-device / PII linking',
    sql: 'Multiple foreign-key join tables required',
    graph: 'Direct node relationship traversal on heterogeneous entities',
  },
  {
    feature: 'Schema flexibility',
    sql: 'Schema migration required for new entity types',
    graph: 'Schema-optional: add node types/properties without migration',
  },
  {
    feature: 'Shortest path finding',
    sql: 'Dijkstra stored procedures (complex, slow)',
    graph: 'Built-in shortestPath() / allShortestPaths() functions',
  },
];

export function ArchitectureDiagram() {
  return (
    <div className="space-y-5">
      {/* Why Graph heading */}
      <div className="bg-[#080C15] rounded-xl border border-white/[0.07] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0">
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Why CognoDB (Graph) Over PostgreSQL (Relational)?</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial crime detection requires following chains of relationships across many entities. Relational databases were built for set operations on rows, not recursive relationship traversal.
            </p>
          </div>
        </div>

        {/* Core concept cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {[
            {
              icon: <Zap className="w-4 h-4 text-indigo-400" />,
              title: 'Index-Free Adjacency',
              body: 'Each node stores direct memory pointers to its neighbours. Traversal cost is O(1) per hop, independent of total database size.',
              bg: 'bg-indigo-500/5 border-indigo-500/15',
            },
            {
              icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
              title: 'SQL Join Explosion',
              body: 'A 6-hop circular loop in SQL requires 6 recursive self-joins scanning billions of intermediate rows on a 10M transaction table.',
              bg: 'bg-amber-500/5 border-amber-500/15',
            },
            {
              icon: <Check className="w-4 h-4 text-emerald-400" />,
              title: 'Native Pattern Matching',
              body: 'openCypher expresses "find all 3–6 hop circular loops" as a single pattern match. No recursion boilerplate or timeout risk.',
              bg: 'bg-emerald-500/5 border-emerald-500/15',
            },
          ].map(({ icon, title, body, bg }) => (
            <div key={title} className={`p-3.5 rounded-xl border ${bg}`}>
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-semibold text-slate-200">{title}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Feature Comparison</h3>
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-48">Feature</th>
                <th className="text-left px-4 py-2.5 text-rose-400/90 font-semibold">PostgreSQL (Relational)</th>
                <th className="text-left px-4 py-2.5 text-emerald-400/90 font-semibold">CognoDB (openCypher)</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'} hover:bg-white/[0.03] transition-colors`}>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">{row.feature}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    <div className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{row.sql}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    <div className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{row.graph}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side code comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SQL */}
        <div className="bg-[#080C15] rounded-xl border border-rose-500/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/5 border-b border-rose-500/15">
            <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-rose-400">PostgreSQL: Recursive CTE (High Latency)</span>
          </div>
          <pre className="p-4 text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto whitespace-pre">
            {SQL_EXAMPLE}
          </pre>
        </div>

        {/* Cypher */}
        <div className="bg-[#080C15] rounded-xl border border-emerald-500/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 border-b border-emerald-500/15">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-400">CognoDB: openCypher (Index-Free Adjacency)</span>
          </div>
          <pre className="p-4 text-[11px] font-mono text-emerald-400/90 leading-relaxed overflow-x-auto whitespace-pre">
            {CYPHER_EXAMPLE}
          </pre>
        </div>
      </div>

      {/* Data Model */}
      <div className="bg-[#080C15] rounded-xl border border-white/[0.07] p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Labeled Property Graph: Data Model</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Account',
              color: 'indigo',
              shape: '◆',
              props: ['accountNo', 'balance', 'riskScore', 'status', 'type'],
            },
            {
              label: 'Customer',
              color: 'violet',
              shape: '●',
              props: ['customerId', 'name', 'email', 'ssn', 'riskScore', 'country'],
            },
            {
              label: 'Device',
              color: 'purple',
              shape: '■',
              props: ['deviceId', 'model', 'ipAddress', 'fingerprint', 'isFlagged'],
            },
            {
              label: 'Merchant',
              color: 'pink',
              shape: '▲',
              props: ['merchantId', 'name', 'category', 'riskLevel'],
            },
          ].map(({ label, color, shape, props }) => {
            const colorMap: Record<string, string> = {
              indigo: 'border-indigo-500/25 bg-indigo-500/5 text-indigo-400',
              violet: 'border-violet-500/25 bg-violet-500/5 text-violet-400',
              purple: 'border-purple-500/25 bg-purple-500/5 text-purple-400',
              pink: 'border-pink-500/25 bg-pink-500/5 text-pink-400',
            };
            return (
              <div key={label} className={`p-3 rounded-xl border ${colorMap[color]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{shape}</span>
                  <span className="text-xs font-bold">{label}</span>
                </div>
                <ul className="space-y-0.5">
                  {props.map((p) => (
                    <li key={p} className="text-[10px] font-mono text-slate-500">{p}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Relationship list */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { rel: '(:Customer)-[:OWNS]→(:Account)', color: 'text-slate-300' },
            { rel: '(:Account)-[:TRANSFERRED {amount}]→(:Account)', color: 'text-indigo-400' },
            { rel: '(:Account)-[:PAID {amount}]→(:Merchant)', color: 'text-pink-400' },
            { rel: '(:Customer)-[:USED_DEVICE]→(:Device)', color: 'text-rose-400' },
            { rel: '(:Customer)-[:SHARES_PII {type}]→(:Customer)', color: 'text-rose-400' },
          ].map(({ rel, color }) => (
            <code key={rel} className={`text-[10px] font-mono ${color} bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded`}>
              {rel}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
