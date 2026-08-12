import { NextRequest, NextResponse } from 'next/server';
import { executeCypher, testConnection } from '@/lib/neo4j';
import { CYPHER_QUERIES } from '@/lib/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceAcc, targetAcc } = body;

    if (!sourceAcc || !targetAcc) {
      return NextResponse.json({ error: 'sourceAcc and targetAcc parameters are required' }, { status: 400 });
    }

    const status = await testConnection();

    if (!status.connected) {
      // Mock path return for demo mode
      return NextResponse.json({
        source: 'mock',
        hopCount: 3,
        nodes: [sourceAcc, 'ACC-102', 'ACC-103', targetAcc],
        pathDescription: `Mock path trace from ${sourceAcc} to ${targetAcc} via 3 intermediate hops.`,
      });
    }

    const { records } = await executeCypher(CYPHER_QUERIES.FIND_SHORTEST_MONEY_PATH, {
      sourceAcc,
      targetAcc,
    });

    if (!records || records.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No active transaction path found between ${sourceAcc} and ${targetAcc} within 8 hops.`,
      });
    }

    const pathObj = records[0].path;
    const hopCount = records[0].hopCount;

    return NextResponse.json({
      found: true,
      source: 'live',
      hopCount,
      path: pathObj,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Path calculation failed' }, { status: 500 });
  }
}
