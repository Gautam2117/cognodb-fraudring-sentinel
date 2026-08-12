import neo4j, { Driver, Session, Record as Neo4jRecord, Integer } from 'neo4j-driver';

// Cache driver across hot reloads in development
let driverInstance: Driver | null = null;

export function getNeo4jDriver(): Driver | null {
  const uri = process.env.COGNO_URI || process.env.NEO4J_URI;
  const user = process.env.COGNO_USER || process.env.NEO4J_USER || 'cognodb';
  const password = process.env.COGNO_PASSWORD || process.env.NEO4J_PASSWORD;

  if (!uri || !password) {
    return null;
  }

  if (!driverInstance) {
    driverInstance = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 50,
        connectionTimeout: 15000,
        disableLosslessIntegers: true, // Automatically converts Neo4j Integers to JS numbers
      }
    );
  }

  return driverInstance;
}

export interface ConnectionStatus {
  connected: boolean;
  uri?: string;
  latencyMs?: number;
  error?: string;
  isMockFallback?: boolean;
}

export async function testConnection(): Promise<ConnectionStatus> {
  const driver = getNeo4jDriver();
  
  if (!driver) {
    return {
      connected: false,
      isMockFallback: true,
      error: 'COGNO_URI or COGNO_PASSWORD not defined in environment variables. Running in interactive demo mode.',
    };
  }

  const start = Date.now();
  const session = driver.session();
  try {
    const res = await session.run('RETURN 1 AS test');
    const latencyMs = Date.now() - start;
    return {
      connected: res.records.length > 0,
      uri: process.env.COGNO_URI,
      latencyMs,
      isMockFallback: false,
    };
  } catch (err: any) {
    return {
      connected: false,
      uri: process.env.COGNO_URI,
      error: err?.message || 'Failed to connect to CognoDB Bolt endpoint',
      isMockFallback: true,
    };
  } finally {
    await session.close();
  }
}

/**
 * Cleanly converts Neo4j types (Node, Relationship, Path, Integer) to plain JS objects
 */
export function formatValue(val: any): any {
  if (val === null || val === undefined) return null;
  
  if (typeof val === 'object' && val !== null && 'low' in val && 'high' in val) {
    return neo4j.integer.toNumber(val as Integer);
  }

  if (Array.isArray(val)) {
    return val.map(formatValue);
  }

  // Neo4j Node
  if (val.labels && val.properties) {
    return {
      id: val.elementId || val.identity?.toString() || val.properties.id || val.properties.accountNo || val.properties.customerId,
      labels: val.labels,
      properties: formatValue(val.properties),
    };
  }

  // Neo4j Relationship
  if (val.type && val.properties) {
    return {
      id: val.elementId || val.identity?.toString(),
      type: val.type,
      start: val.startNodeElementId || val.start?.toString(),
      end: val.endNodeElementId || val.end?.toString(),
      properties: formatValue(val.properties),
    };
  }

  // Neo4j Path
  if (val.segments) {
    return {
      start: formatValue(val.start),
      end: formatValue(val.end),
      segments: val.segments.map((seg: any) => ({
        start: formatValue(seg.start),
        relationship: formatValue(seg.relationship),
        end: formatValue(seg.end),
      })),
      length: val.length,
    };
  }

  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = formatValue(val[key]);
    }
    return res;
  }

  return val;
}

/**
 * Parameterized Cypher query runner using official Neo4j driver
 */
export async function executeCypher<T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<{ records: Record<string, any>[]; summary: any }> {
  const driver = getNeo4jDriver();
  
  if (!driver) {
    throw new Error('CognoDB driver not connected. Check environment variables.');
  }

  const session = driver.session();
  try {
    const result = await session.run(query, params);
    const records = result.records.map((rec) => {
      const obj: Record<string, any> = {};
      rec.keys.forEach((key) => {
        obj[key as string] = formatValue(rec.get(key));
      });
      return obj;
    });

    return {
      records,
      summary: {
        query: result.summary.query.text,
        parameters: result.summary.query.parameters,
        updateStatistics: result.summary.counters.updates(),
        resultAvailableAfterMs: result.summary.resultAvailableAfter?.toNumber?.() || 0,
        resultConsumedAfterMs: result.summary.resultConsumedAfter?.toNumber?.() || 0,
      },
    };
  } finally {
    await session.close();
  }
}
