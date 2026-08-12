// Type-safe Cypher query definitions and mock data for CognoDB

export const CYPHER_QUERIES = {
  // 1. Fetch entire active graph for visual canvas
  FETCH_GRAPH: `
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, r, m
    LIMIT 250
  `,

  // 2. Multi-hop Circular Money Laundering (Layering Loop) Detection
  // CognoDB openCypher - uses explicit hop patterns (variable-length circular syntax not supported)
  // Deduplicates ring rotations by only keeping the row where the start node is alphabetically first
  DETECT_CIRCULAR_LOOPS: `
    MATCH (a:Account)-[r1:TRANSFERRED]->(b:Account)-[r2:TRANSFERRED]->(c:Account)-[r3:TRANSFERRED]->(a)
    WHERE a.accountNo <> b.accountNo AND b.accountNo <> c.accountNo AND a.accountNo <> c.accountNo
      AND r1.amount >= 2500 AND r2.amount >= 2500 AND r3.amount >= 2500
      AND a.accountNo < b.accountNo AND a.accountNo < c.accountNo
    WITH [a.accountNo, b.accountNo, c.accountNo] AS ringAccounts,
         [r1.amount, r2.amount, r3.amount] AS amounts,
         r1.amount + r2.amount + r3.amount AS totalVolume,
         3 AS hopCount
    RETURN ringAccounts, amounts, totalVolume, hopCount
    UNION
    MATCH (a:Account)-[r1:TRANSFERRED]->(b:Account)-[r2:TRANSFERRED]->(c:Account)-[r3:TRANSFERRED]->(d:Account)-[r4:TRANSFERRED]->(a)
    WHERE a.accountNo <> b.accountNo AND b.accountNo <> c.accountNo AND c.accountNo <> d.accountNo
      AND r1.amount >= 2500 AND r2.amount >= 2500 AND r3.amount >= 2500 AND r4.amount >= 2500
      AND a.accountNo < b.accountNo AND a.accountNo < c.accountNo AND a.accountNo < d.accountNo
    WITH [a.accountNo, b.accountNo, c.accountNo, d.accountNo] AS ringAccounts,
         [r1.amount, r2.amount, r3.amount, r4.amount] AS amounts,
         r1.amount + r2.amount + r3.amount + r4.amount AS totalVolume,
         4 AS hopCount
    RETURN ringAccounts, amounts, totalVolume, hopCount
    ORDER BY totalVolume DESC
    LIMIT 10
  `,

  // 3. Synthetic Identity Cluster Detection (Shared devices, phone, SSN across accounts)
  DETECT_SYNTHETIC_IDENTITIES: `
    MATCH (c1:Customer)-[r1:USED_DEVICE|SHARES_PII]-(sharedEntity)-[r2:USED_DEVICE|SHARES_PII]-(c2:Customer)
    WHERE c1.customerId < c2.customerId
    MATCH (c1)-[:OWNS]->(a1:Account)
    MATCH (c2)-[:OWNS]->(a2:Account)
    RETURN c1.name AS customer1, c1.customerId AS id1, c1.riskScore AS risk1,
           c2.name AS customer2, c2.customerId AS id2, c2.riskScore AS risk2,
           labels(sharedEntity)[0] AS sharedEntityType,
           coalesce(sharedEntity.deviceId, sharedEntity.type, 'Shared Identifier') AS sharedDetail,
           a1.accountNo AS acc1, a2.accountNo AS acc2
    ORDER BY c1.riskScore + c2.riskScore DESC
    LIMIT 10
  `,

  // 4. Multi-hop Shortest Path Finder between two financial accounts
  FIND_SHORTEST_MONEY_PATH: `
    MATCH path = shortestPath((src:Account {accountNo: $sourceAcc})-[r:TRANSFERRED*1..8]->(dst:Account {accountNo: $targetAcc}))
    RETURN path, length(path) AS hopCount
  `,

  // 5. Centrality & Mule Account Hub Analysis
  GET_HIGH_RISK_HUBS: `
    MATCH (a:Account)-[r:TRANSFERRED]->(b:Account)
    WITH a, count(r) AS outboundTx, sum(r.amount) AS totalOutflow
    MATCH (c:Account)-[inR:TRANSFERRED]->(a)
    WITH a, outboundTx, totalOutflow, count(inR) AS inboundTx, sum(inR.amount) AS totalInflow
    RETURN a.accountNo AS accountNo, 
           a.riskScore AS riskScore, 
           a.status AS status, 
           inboundTx, outboundTx, 
           totalInflow, totalOutflow,
           (totalInflow + totalOutflow) AS totalVolume
    ORDER BY totalVolume DESC
    LIMIT 8
  `,

  // 6. Summary Overview Metrics
  GET_GRAPH_STATS: `
    MATCH (n)
    WITH count(n) AS totalNodes
    MATCH ()-[r]->()
    WITH totalNodes, count(r) AS totalRelationships
    MATCH (a:Account {status: 'FLAGGED'})
    WITH totalNodes, totalRelationships, count(a) AS flaggedAccounts
    MATCH path = (src:Account)-[:TRANSFERRED*3..6]->(src)
    RETURN totalNodes, totalRelationships, flaggedAccounts, count(path) AS circularRings
  `
};

export interface GraphNode {
  id: string;
  label: string;
  type: 'Account' | 'Customer' | 'Device' | 'Merchant';
  properties: Record<string, any>;
  riskScore?: number;
  status?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: 'TRANSFERRED' | 'OWNS' | 'USED_DEVICE' | 'PAID' | 'SHARES_PII';
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * High-quality mock graph data fallback used when database is not connected
 */
export function getMockGraphData(): GraphData {
  const nodes: GraphNode[] = [
    // Fraud Ring Alpha (Layering Loop 1)
    { id: 'ACC-101', label: 'ACC-101 (Mule)', type: 'Account', riskScore: 92, status: 'FLAGGED', properties: { balance: 45000, riskScore: 92, type: 'Checking' } },
    { id: 'ACC-102', label: 'ACC-102 (Shell)', type: 'Account', riskScore: 88, status: 'FLAGGED', properties: { balance: 32000, riskScore: 88, type: 'Business' } },
    { id: 'ACC-103', label: 'ACC-103 (Layer)', type: 'Account', riskScore: 85, status: 'SUSPICIOUS', properties: { balance: 29000, riskScore: 85, type: 'Checking' } },
    { id: 'ACC-104', label: 'ACC-104 (Sink)', type: 'Account', riskScore: 95, status: 'FLAGGED', properties: { balance: 120000, riskScore: 95, type: 'Investment' } },
    
    // Fraud Ring Beta (Layering Loop 2)
    { id: 'ACC-201', label: 'ACC-201 (Victim)', type: 'Account', riskScore: 15, status: 'ACTIVE', properties: { balance: 8500, riskScore: 15, type: 'Savings' } },
    { id: 'ACC-202', label: 'ACC-202 (Mule-B)', type: 'Account', riskScore: 78, status: 'SUSPICIOUS', properties: { balance: 19000, riskScore: 78, type: 'Checking' } },
    { id: 'ACC-203', label: 'ACC-203 (Offshore)', type: 'Account', riskScore: 90, status: 'FLAGGED', properties: { balance: 240000, riskScore: 90, type: 'Wire' } },

    // Customers
    { id: 'CUST-01', label: 'Alice Vance', type: 'Customer', riskScore: 90, properties: { ssn: 'XXX-XX-4912', email: 'alice@darkweb.org', country: 'US' } },
    { id: 'CUST-02', label: 'Bob Sterling', type: 'Customer', riskScore: 85, properties: { ssn: 'XXX-XX-4912', email: 'bobs@tempmail.io', country: 'US' } },
    { id: 'CUST-03', label: 'Charlie Crypto', type: 'Customer', riskScore: 94, properties: { ssn: 'XXX-XX-8821', email: 'charlie@privacy.net', country: 'CY' } },
    { id: 'CUST-04', label: 'Diana Prince', type: 'Customer', riskScore: 12, properties: { ssn: 'XXX-XX-1102', email: 'diana@corp.com', country: 'US' } },

    // Shared Devices
    { id: 'DEV-909', label: 'iPhone 14 (Flagged)', type: 'Device', properties: { ipAddress: '194.26.29.11', fingerprint: 'fp_a98812c', isFlagged: true } },
    { id: 'DEV-404', label: 'MacBook Pro', type: 'Device', properties: { ipAddress: '72.14.201.2', fingerprint: 'fp_bb7710a', isFlagged: false } },

    // Merchants
    { id: 'MERCH-88', label: 'Apex Crypto Exchange', type: 'Merchant', properties: { category: 'Crypto', riskLevel: 'HIGH' } },
    { id: 'MERCH-12', label: 'Luxury Goods Ltd', type: 'Merchant', properties: { category: 'Retail', riskLevel: 'MEDIUM' } }
  ];

  const edges: GraphEdge[] = [
    // Circular Fraud Loop 1: ACC-101 -> ACC-102 -> ACC-103 -> ACC-104 -> ACC-101
    { id: 'e1', from: 'ACC-101', to: 'ACC-102', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 25000, timestamp: '2026-08-10T10:00:00Z', txHash: '0x8a71...33' } },
    { id: 'e2', from: 'ACC-102', to: 'ACC-103', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 24500, timestamp: '2026-08-10T10:15:00Z', txHash: '0x9b12...44' } },
    { id: 'e3', from: 'ACC-103', to: 'ACC-104', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 24000, timestamp: '2026-08-10T10:30:00Z', txHash: '0x1c44...55' } },
    { id: 'e4', from: 'ACC-104', to: 'ACC-101', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 23500, timestamp: '2026-08-10T11:00:00Z', txHash: '0x7f99...11' } },

    // Loop 2: ACC-201 -> ACC-202 -> ACC-203 -> ACC-202
    { id: 'e5', from: 'ACC-201', to: 'ACC-202', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 15000, timestamp: '2026-08-11T14:20:00Z' } },
    { id: 'e6', from: 'ACC-202', to: 'ACC-203', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 14800, timestamp: '2026-08-11T14:45:00Z' } },
    { id: 'e7', from: 'ACC-203', to: 'ACC-202', label: 'TRANSFERRED', type: 'TRANSFERRED', properties: { amount: 14000, timestamp: '2026-08-11T15:30:00Z' } },

    // Customer Ownership
    { id: 'e8', from: 'CUST-01', to: 'ACC-101', label: 'OWNS', type: 'OWNS', properties: {} },
    { id: 'e9', from: 'CUST-02', to: 'ACC-102', label: 'OWNS', type: 'OWNS', properties: {} },
    { id: 'e10', from: 'CUST-03', to: 'ACC-104', label: 'OWNS', type: 'OWNS', properties: {} },
    { id: 'e11', from: 'CUST-04', to: 'ACC-201', label: 'OWNS', type: 'OWNS', properties: {} },

    // Shared Device (Synthetic Identity Link)
    { id: 'e12', from: 'CUST-01', to: 'DEV-909', label: 'USED_DEVICE', type: 'USED_DEVICE', properties: { lastUsed: '2026-08-12' } },
    { id: 'e13', from: 'CUST-02', to: 'DEV-909', label: 'USED_DEVICE', type: 'USED_DEVICE', properties: { lastUsed: '2026-08-12' } },

    // Shared SSN PII Link
    { id: 'e14', from: 'CUST-01', to: 'CUST-02', label: 'SHARES_PII', type: 'SHARES_PII', properties: { type: 'SSN' } },

    // Merchant Transactions
    { id: 'e15', from: 'ACC-104', to: 'MERCH-88', label: 'PAID', type: 'PAID', properties: { amount: 50000 } },
    { id: 'e16', from: 'ACC-201', to: 'MERCH-12', label: 'PAID', type: 'PAID', properties: { amount: 450 } }
  ];

  return { nodes, edges };
}

export function getMockFraudRings() {
  return [
    {
      id: 'ring-1',
      title: 'High-Volume Layering Loop (4 Hops)',
      riskScore: 96,
      hopCount: 4,
      totalVolume: 97000,
      accounts: ['ACC-101', 'ACC-102', 'ACC-103', 'ACC-104'],
      amounts: [25000, 24500, 24000, 23500],
      description: 'Circular money movement detected spanning 4 accounts within 1 hour. Classic structuring & laundering pattern.'
    },
    {
      id: 'ring-2',
      title: 'Offshore Re-cycling Ring (3 Hops)',
      riskScore: 89,
      hopCount: 3,
      totalVolume: 43800,
      accounts: ['ACC-202', 'ACC-203', 'ACC-202'],
      amounts: [14800, 14000],
      description: 'Rapid outbound/inbound transfer loop between Domestic Mule ACC-202 and Offshore Shell ACC-203.'
    }
  ];
}

export function getMockSyntheticIdentities() {
  return [
    {
      id: 'syn-1',
      customer1: 'Alice Vance',
      customer2: 'Bob Sterling',
      sharedType: 'Device & SSN',
      sharedDetail: 'iPhone 14 (Flagged IP: 194.26.29.11) + Matching SSN',
      riskScore: 92,
      acc1: 'ACC-101',
      acc2: 'ACC-102'
    }
  ];
}
