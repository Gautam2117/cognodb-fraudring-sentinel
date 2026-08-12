# FraudRing Sentinel: Financial Crime and Synthetic Identity Graph Intelligence Platform

Built for the Wexa AI Software Engineer (Full-Stack / Web) Assessment Task.

---

## Executive Summary and Use Case

FraudRing Sentinel is a financial intelligence and automated fraud ring detection platform powered by CognoDB Cloud (openCypher graph database over Bolt protocol).

Financial crime networks do not operate as isolated transaction rows. Fraud rings rely on multi-hop circular layering (moving funds through 3 to 6 intermediate accounts before returning to the origin) and synthetic identity clusters (multiple customer accounts sharing physical devices, IP subnets, or stolen SSN fragments).

FraudRing Sentinel models financial entities (Accounts, Customers, Devices, Merchants) as a labeled property graph and executes real-time multi-hop Cypher queries to automatically detect, highlight, and trace money laundering loops and synthetic identity networks.

---

## Why a Graph Database? (Graph vs Relational Schema)

### The Core Problem with Relational Databases (SQL)
In a traditional relational database (such as PostgreSQL or MySQL), transaction records are stored in tabular rows (`transactions(id, from_account_id, to_account_id, amount, timestamp)`).

When an analyst queries:
> "Find all circular money movement loops where money travels through 3 to 6 intermediate accounts and returns to the source account."

A relational SQL database must execute recursive Common Table Expressions (CTEs) or multiple self-joins:

```sql
-- Relational SQL (Recursive CTE)
WITH RECURSIVE layering_loop AS (
  SELECT from_account_id, to_account_id, amount, 1 AS depth, ARRAY[from_account_id] AS path
  FROM transactions
  WHERE amount >= 2500
  
  UNION ALL
  
  SELECT t.from_account_id, t.to_account_id, t.amount, l.depth + 1, path || t.from_account_id
  FROM transactions t
  JOIN layering_loop l ON t.from_account_id = l.to_account_id
  WHERE depth < 6 AND NOT (t.from_account_id = ANY(path))
)
SELECT * FROM layering_loop WHERE to_account_id = path[1];
```

### Limitations of Relational Schemas
1. Join Latency: Each hop requires index scans across millions of rows. At 4 to 6 hops, query performance degrades exponentially and frequently times out.
2. Rigid Schema Boundaries: Linking accounts to shared devices, IP addresses, or stolen SSN fragments requires intermediate mapping tables (`account_devices`, `customer_ssn_mappings`), making traversal queries complex to write and slow to execute.

---

### The CognoDB Graph Advantage (openCypher)
Graph databases store data using Index-Free Adjacency. Memory pointers connect nodes directly to their relationships. Traversal speed depends only on the number of connected edges rather than total database size.

In openCypher, the exact same multi-hop circular fraud ring query is expressed natively in a single pattern match:

```cypher
// CognoDB openCypher (Index-Free Adjacency Traversal)
MATCH path = (a:Account)-[r:TRANSFERRED*3..6]->(a)
WHERE ALL(rel IN relationships(path) WHERE rel.amount >= 2500)
WITH path, 
     [node IN nodes(path) | node.accountNo] AS ringAccounts,
     [rel IN relationships(path) | rel.amount] AS amounts,
     reduce(total = 0, rel IN relationships(path) | total + rel.amount) AS totalVolume
RETURN ringAccounts, amounts, totalVolume, length(path) AS hopCount
ORDER BY totalVolume DESC;
```

### Key Rationale Summary
| Feature | Relational Schema (PostgreSQL) | CognoDB Graph Database (openCypher) |
| :--- | :--- | :--- |
| **Multi-Hop Traversal (3-6 Hops)** | Slow recursive CTEs / self-joins | Native pattern matching (`-[:TRANSFERRED*3..6]->`) |
| **Performance Scaling** | Degrades exponentially with depth ($O(N^k)$) | Constant time pointer navigation ($O(1)$ per hop) |
| **Synthetic Identity Connections** | Complex multi-table outer joins | Instant multi-entity hop (`(:Customer)-[:USED_DEVICE]-(:Device)`) |
| **Shortest Money Path Finding** | Complex Djikstra stored procedures | Built-in `shortestPath()` function |

---

## Graph Data Model and Schema

```mermaid
graph TD
    %% Nodes
    C1[Customer: Alice Vance] -->|OWNS| A1[Account: ACC-101]
    C2[Customer: Bob Sterling] -->|OWNS| A2[Account: ACC-102]
    C3[Customer: Charlie Crypto] -->|OWNS| A3[Account: ACC-104]

    %% Layering Loop Relationships
    A1 -->|TRANSFERRED $25,000| A2
    A2 -->|TRANSFERRED $24,500| A4[Account: ACC-103]
    A4 -->|TRANSFERRED $24,000| A3
    A3 -->|TRANSFERRED $23,500| A1

    %% Synthetic Identity and Device Sharing
    C1 -->|USED_DEVICE| D1[Device: iPhone 14 Pro]
    C2 -->|USED_DEVICE| D1
    C1 -->|SHARES_PII: SSN| C2

    %% Merchant Outflow
    A3 -->|PAID $50,000| M1[Merchant: Apex Crypto Exchange]
```

### Entity Taxonomy
* **`Account` Node**: `accountNo`, `balance`, `riskScore`, `status` (`FLAGGED`, `SUSPICIOUS`, `ACTIVE`), `type`.
* **`Customer` Node**: `customerId`, `name`, `email`, `riskScore`, `ssn`, `country`.
* **`Device` Node**: `deviceId`, `model`, `ipAddress`, `fingerprint`, `isFlagged`.
* **`Merchant` Node**: `merchantId`, `name`, `category`, `riskLevel`.
* **Relationships**:
  * `(:Customer)-[:OWNS]->(:Account)`
  * `(:Account)-[:TRANSFERRED {amount, timestamp, txHash}]->(:Account)`
  * `(:Account)-[:PAID {amount, timestamp}]->(:Merchant)`
  * `(:Customer)-[:USED_DEVICE {lastUsed}]->(:Device)`
  * `(:Customer)-[:SHARES_PII {type: 'SSN' | 'PHONE'}]->(:Customer)`

---

## Step-by-Step Setup Guide

### 1. Provision Free CognoDB Cloud Instance
1. Go to https://console.cognodb.com/signup and create a free account.
2. Create a free c0 instance and select a region.
3. Save your connection details:
   - **URI**: `bolt+s://<instance-id>.databases.cognodb.cloud`
   - **Username**: `cognodb`
   - **Password**: (saved from console)

### 2. Configure Local Environment
Clone the repository and copy `.env.example` to `.env.local`:

```bash
git clone https://github.com/Gautam2117/cognodb-fraudring-sentinel.git
cd cognodb-fraudring-sentinel
cp .env.example .env.local
```

Edit `.env.local`:
```env
COGNO_URI=bolt+s://your-instance-id.databases.cognodb.cloud
COGNO_USER=cognodb
COGNO_PASSWORD=your-saved-password
```

Note: If no database credentials are provided, the application activates interactive demo mode so evaluators can explore immediately.

### 3. Run Database Seed Script
Populate your CognoDB instance with financial network data (nodes and relationships containing layering loops, mule chains, and synthetic identity networks):

```bash
npm install
npm run seed
```

Output:
```text
Connecting to CognoDB Cloud...
Clearing existing database graph...
Creating constraints and indexes...
Injecting Financial Crime and Fraud Ring Dataset...
Seed Completed Successfully!
Summary: Injected Nodes and Relationships into CognoDB Cloud.
```

### 4. Launch Web Application
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

---

## Technical Stack and Code Structure

* **Database Layer**: CognoDB Cloud (openCypher over Bolt protocol via `neo4j-driver`)
* **Frontend Framework**: Next.js 14 (App Router) with TypeScript and TailwindCSS
* **Graph Visualization**: Vis.js Network (Interactive physics engine, canvas controls)
* **UI Components**: Lucide React

### Repository Directory Structure
```text
CognoDB/
├── app/
│   ├── api/
│   │   ├── graph/
│   │   │   ├── query/route.ts       # Parameterized Cypher runner and graph view
│   │   │   ├── fraud-rings/route.ts # Multi-hop layering and synthetic ring detector
│   │   │   └── path-finder/route.ts # Shortest path tracer endpoint
│   │   ├── health/route.ts          # CognoDB Bolt connection ping and latency
│   │   └── seed/route.ts            # Web UI seed trigger
│   ├── globals.css                  # Dark mode styling and utilities
│   ├── layout.tsx                   # Root HTML layout
│   └── page.tsx                     # Main Sentinel Dashboard
├── components/
│   ├── ConnectionStatus.tsx         # Real-time CognoDB status badge and latency
│   ├── GraphCanvas.tsx              # Interactive Vis.js network graph canvas
│   ├── FraudRingInspector.tsx       # Fraud ring detection panel
│   ├── CypherPlayground.tsx         # Interactive openCypher console with presets
│   ├── PathFinderModal.tsx          # Multi-hop shortest path tracer modal
│   └── ArchitectureDiagram.tsx      # Graph vs SQL comparison and schema visualizer
├── lib/
│   ├── neo4j.ts                     # Neo4j Bolt driver initialization
│   └── queries.ts                   # Type-safe Cypher queries and fallback data
├── scripts/
│   └── seed.ts                      # Standalone CLI database seed script
├── .env.example                     # Environment template
├── package.json                     # Dependencies and npm scripts
└── README.md                        # Documentation
```

---

## Key Cypher Queries Explained

### 1. Circular Layering Loop Detection (Multi-Hop)
```cypher
MATCH path = (a:Account)-[r:TRANSFERRED*3..6]->(a)
WHERE ALL(rel IN relationships(path) WHERE rel.amount >= 2500)
WITH path, 
     [node IN nodes(path) | node.accountNo] AS ringAccounts,
     [rel IN relationships(path) | rel.amount] AS amounts,
     reduce(total = 0, rel IN relationships(path) | total + rel.amount) AS totalVolume
RETURN ringAccounts, amounts, totalVolume, length(path) AS hopCount, path
ORDER BY totalVolume DESC
LIMIT 10
```

### 2. Synthetic Identity Cluster Detection
```cypher
MATCH (c1:Customer)-[r1:USED_DEVICE|SHARES_PII]-(sharedEntity)-[r2:USED_DEVICE|SHARES_PII]-(c2:Customer)
WHERE c1.customerId < c2.customerId
MATCH (c1)-[:OWNS]->(a1:Account)
MATCH (c2)-[:OWNS]->(a2:Account)
RETURN c1.name AS customer1, c2.name AS customer2,
       labels(sharedEntity)[0] AS sharedEntityType,
       sharedEntity.deviceId AS sharedDetail,
       a1.accountNo AS acc1, a2.accountNo AS acc2
```

### 3. Multi-Hop Shortest Path Money Flow Trace
```cypher
MATCH path = shortestPath((src:Account {accountNo: $sourceAcc})-[r:TRANSFERRED*1..8]->(dst:Account {accountNo: $targetAcc}))
RETURN path, length(path) AS hopCount
```

---

## UI Screenshots and Interactive Features

### 1. Main Graph Canvas and Fraud Ring Inspector
![Main Dashboard Graph Canvas](public/screenshots/dashboard.png)
*Interactive graph canvas powered by Vis.js physics engine, displaying labeled heterogeneous nodes (Accounts, Customers, Devices, Merchants) and real-time fraud ring highlighting.*

### 2. Parameterized openCypher Query Console
![Cypher Playground Console](public/screenshots/cypher_playground.png)
*Interactive query console with pre-configured Cypher presets for multi-hop layering loop detection, synthetic identity search, hub centrality ranking, and full graph fetches.*

### 3. Architecture Comparison: Graph (CognoDB) vs Relational (PostgreSQL)
![Graph vs SQL Architecture Comparison](public/screenshots/graph_vs_sql.png)
*Visual breakdown of Index-Free Adjacency pointer traversal versus recursive self-joins and CTE join explosion in SQL.*

---

## Hosted Demo and Submission Details

* **GitHub Repository**: https://github.com/Gautam2117/cognodb-fraudring-sentinel
* **Live Demo URL**: https://cognodb-fraudring-sentinel.vercel.app
* **Subject Line**: `CognoDB Assignment 2 - Gautam Govind`
* **Recipient**: `hr@wexa.ai`

