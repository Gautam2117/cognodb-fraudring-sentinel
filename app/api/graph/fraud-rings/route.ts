import { NextResponse } from 'next/server';
import { executeCypher, testConnection } from '@/lib/neo4j';
import { CYPHER_QUERIES, getMockFraudRings, getMockSyntheticIdentities } from '@/lib/queries';

export async function GET() {
  try {
    const status = await testConnection();

    if (!status.connected) {
      return NextResponse.json({
        source: 'mock',
        circularRings: getMockFraudRings(),
        syntheticIdentities: getMockSyntheticIdentities(),
      });
    }

    // Execute multi-hop Cypher queries concurrently
    const [circularRes, syntheticRes] = await Promise.all([
      executeCypher(CYPHER_QUERIES.DETECT_CIRCULAR_LOOPS),
      executeCypher(CYPHER_QUERIES.DETECT_SYNTHETIC_IDENTITIES),
    ]);

    const circularRings = circularRes.records.map((rec, i) => ({
      id: `ring-${i + 1}`,
      title: `${rec.hopCount}-Hop Circular Layering Loop`,
      riskScore: 90 + Math.min(10, rec.hopCount),
      hopCount: rec.hopCount,
      totalVolume: rec.totalVolume,
      accounts: rec.ringAccounts,
      amounts: rec.amounts,
      description: `Detected circular money flow across ${rec.hopCount} accounts totaling $${rec.totalVolume.toLocaleString()}.`,
    }));

    const syntheticIdentities = syntheticRes.records.map((rec, i) => ({
      id: `syn-${i + 1}`,
      customer1: rec.customer1,
      customer2: rec.customer2,
      sharedType: rec.sharedEntityType,
      sharedDetail: rec.sharedDetail,
      riskScore: Math.max(rec.risk1 || 75, rec.risk2 || 75),
      acc1: rec.acc1,
      acc2: rec.acc2,
    }));

    return NextResponse.json({
      source: 'live',
      circularRings,
      syntheticIdentities,
    });
  } catch (error: any) {
    return NextResponse.json({
      source: 'mock',
      circularRings: getMockFraudRings(),
      syntheticIdentities: getMockSyntheticIdentities(),
      error: error?.message,
    });
  }
}
