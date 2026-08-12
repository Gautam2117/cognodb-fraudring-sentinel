import { NextRequest, NextResponse } from 'next/server';
import { executeCypher, testConnection } from '@/lib/neo4j';
import { CYPHER_QUERIES, getMockGraphData, GraphNode, GraphEdge } from '@/lib/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customQuery = body.query || CYPHER_QUERIES.FETCH_GRAPH;
    const params = body.params || {};

    const connStatus = await testConnection();

    // Fallback to mock data if database is not connected
    if (!connStatus.connected) {
      if (customQuery === CYPHER_QUERIES.FETCH_GRAPH || !body.query) {
        return NextResponse.json({
          source: 'mock',
          data: getMockGraphData(),
          message: 'Running in interactive demo mode (CognoDB not connected).',
        });
      }
      return NextResponse.json({
        source: 'mock',
        records: [],
        message: 'CognoDB credentials not configured in .env.local. Connect your instance to execute live custom Cypher.',
      });
    }

    const { records, summary } = await executeCypher(customQuery, params);

    // If query is the main graph fetch, transform records into node & edge lists
    if (customQuery === CYPHER_QUERIES.FETCH_GRAPH) {
      const nodeMap = new Map<string, GraphNode>();
      const edgeMap = new Map<string, GraphEdge>();

      records.forEach((rec) => {
        ['n', 'm'].forEach((key) => {
          const item = rec[key];
          if (item && item.labels) {
            const nodeType = item.labels[0] || 'Account';
            const nodeId = item.properties.accountNo || item.properties.customerId || item.properties.deviceId || item.properties.merchantId || item.id;
            const label = item.properties.name || item.properties.accountNo || item.properties.deviceId || item.properties.merchantId || nodeId;

            if (!nodeMap.has(nodeId)) {
              nodeMap.set(nodeId, {
                id: nodeId,
                label,
                type: nodeType as any,
                properties: item.properties,
                riskScore: item.properties.riskScore,
                status: item.properties.status,
              });
            }
          }
        });

        const r = rec.r;
        if (r && r.type && r.start && r.end) {
          const edgeId = r.id || `${r.start}-${r.type}-${r.end}`;
          if (!edgeMap.has(edgeId)) {
            edgeMap.set(edgeId, {
              id: edgeId,
              from: r.start,
              to: r.end,
              label: r.type,
              type: r.type as any,
              properties: r.properties || {},
            });
          }
        }
      });

      return NextResponse.json({
        source: 'live',
        data: {
          nodes: Array.from(nodeMap.values()),
          edges: Array.from(edgeMap.values()),
        },
        summary,
      });
    }

    return NextResponse.json({
      source: 'live',
      records,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute Cypher query' },
      { status: 500 }
    );
  }
}
