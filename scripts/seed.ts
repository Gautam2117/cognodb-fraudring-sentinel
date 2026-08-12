import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.COGNO_URI || process.env.NEO4J_URI;
const user = process.env.COGNO_USER || process.env.NEO4J_USER || 'cognodb';
const password = process.env.COGNO_PASSWORD || process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.error('❌ Error: COGNO_URI and COGNO_PASSWORD must be set in .env.local to seed CognoDB Cloud.');
  console.log('💡 Example: COGNO_URI=bolt+s://<instance-id>.databases.cognodb.cloud COGNO_PASSWORD=<password>');
  process.exit(1);
}

console.log(`🔌 Connecting to CognoDB Cloud at: ${uri}`);
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  disableLosslessIntegers: true,
});

async function seed() {
  const session = driver.session();
  try {
    console.log('🧹 Clearing existing database graph...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('🔒 Creating constraints and indexes...');
    try {
      await session.run('CREATE CONSTRAINT account_no IF NOT EXISTS FOR (a:Account) REQUIRE a.accountNo IS UNIQUE');
      await session.run('CREATE CONSTRAINT customer_id IF NOT EXISTS FOR (c:Customer) REQUIRE c.customerId IS UNIQUE');
      await session.run('CREATE CONSTRAINT device_id IF NOT EXISTS FOR (d:Device) REQUIRE d.deviceId IS UNIQUE');
    } catch (e: any) {
      console.log('⚠️ Constraint creation notice (continuing):', e.message);
    }

    console.log('🌱 Injecting realistic Financial Crime & Fraud Ring Dataset...');

    // 1. Create Accounts
    const accounts = [
      // Ring Alpha (4-Hop Circular Layering Loop)
      { accountNo: 'ACC-101', balance: 52000, riskScore: 92, status: 'FLAGGED', type: 'Checking', createdAt: '2026-01-15' },
      { accountNo: 'ACC-102', balance: 48000, riskScore: 88, status: 'FLAGGED', type: 'Business', createdAt: '2026-02-01' },
      { accountNo: 'ACC-103', balance: 45000, riskScore: 85, status: 'SUSPICIOUS', type: 'Checking', createdAt: '2026-03-10' },
      { accountNo: 'ACC-104', balance: 135000, riskScore: 96, status: 'FLAGGED', type: 'Investment', createdAt: '2026-01-20' },

      // Ring Beta (3-Hop Offshore Re-cycling Loop)
      { accountNo: 'ACC-201', balance: 12500, riskScore: 20, status: 'ACTIVE', type: 'Savings', createdAt: '2025-11-05' },
      { accountNo: 'ACC-202', balance: 28000, riskScore: 78, status: 'SUSPICIOUS', type: 'Checking', createdAt: '2026-04-12' },
      { accountNo: 'ACC-203', balance: 310000, riskScore: 90, status: 'FLAGGED', type: 'Offshore-Wire', createdAt: '2026-05-01' },

      // Mule Chain Alpha (Multi-Hop Lineage: ACC-301 -> ACC-302 -> ACC-303 -> ACC-304)
      { accountNo: 'ACC-301', balance: 95000, riskScore: 89, status: 'FLAGGED', type: 'Wire', createdAt: '2026-06-01' },
      { accountNo: 'ACC-302', balance: 94000, riskScore: 82, status: 'SUSPICIOUS', type: 'Checking', createdAt: '2026-06-02' },
      { accountNo: 'ACC-303', balance: 92500, riskScore: 84, status: 'SUSPICIOUS', type: 'Checking', createdAt: '2026-06-03' },
      { accountNo: 'ACC-304', balance: 91000, riskScore: 94, status: 'FLAGGED', type: 'Crypto-Onramp', createdAt: '2026-06-04' },

      // Legitimate Accounts (Background Noise)
      { accountNo: 'ACC-401', balance: 4500, riskScore: 5, status: 'ACTIVE', type: 'Checking', createdAt: '2025-08-10' },
      { accountNo: 'ACC-402', balance: 8900, riskScore: 8, status: 'ACTIVE', type: 'Savings', createdAt: '2025-09-15' },
      { accountNo: 'ACC-403', balance: 14200, riskScore: 12, status: 'ACTIVE', type: 'Checking', createdAt: '2025-10-01' }
    ];

    for (const acc of accounts) {
      await session.run(
        `CREATE (a:Account {
          accountNo: $accountNo, 
          balance: $balance, 
          riskScore: $riskScore, 
          status: $status, 
          type: $type, 
          createdAt: $createdAt
        })`,
        acc
      );
    }

    // 2. Create Customers
    const customers = [
      { customerId: 'CUST-101', name: 'Alice Vance', email: 'alice.v@darknet.io', riskScore: 92, ssn: 'XXX-XX-4912', country: 'US' },
      { customerId: 'CUST-102', name: 'Bob Sterling', email: 'bobs@tempmail.org', riskScore: 88, ssn: 'XXX-XX-4912', country: 'US' },
      { customerId: 'CUST-103', name: 'Charlie Crypto', email: 'charlie@privacy.ch', riskScore: 96, ssn: 'XXX-XX-8821', country: 'CY' },
      { customerId: 'CUST-104', name: 'David Mule', email: 'david.m@quickmail.cc', riskScore: 89, ssn: 'XXX-XX-3019', country: 'US' },
      { customerId: 'CUST-201', name: 'Emily Thorne', email: 'emily@corporate.com', riskScore: 8, ssn: 'XXX-XX-1102', country: 'US' },
      { customerId: 'CUST-202', name: 'Frank Wright', email: 'frank.w@university.edu', riskScore: 5, ssn: 'XXX-XX-7731', country: 'US' }
    ];

    for (const cust of customers) {
      await session.run(
        `CREATE (c:Customer {
          customerId: $customerId,
          name: $name,
          email: $email,
          riskScore: $riskScore,
          ssn: $ssn,
          country: $country
        })`,
        cust
      );
    }

    // 3. Create Devices
    const devices = [
      { deviceId: 'DEV-881', model: 'iPhone 14 Pro', ipAddress: '194.26.29.11', isFlagged: true, fingerprint: 'fp_a98812c' },
      { deviceId: 'DEV-902', model: 'MacBook Air M2', ipAddress: '72.14.201.2', isFlagged: false, fingerprint: 'fp_b11290x' },
      { deviceId: 'DEV-443', model: 'Android Emulator', ipAddress: '185.220.101.5', isFlagged: true, fingerprint: 'fp_e77312m' }
    ];

    for (const dev of devices) {
      await session.run(
        `CREATE (d:Device {
          deviceId: $deviceId,
          model: $model,
          ipAddress: $ipAddress,
          isFlagged: $isFlagged,
          fingerprint: $fingerprint
        })`,
        dev
      );
    }

    // 4. Create Merchants
    const merchants = [
      { merchantId: 'MERCH-01', name: 'Apex Crypto Exchange', category: 'Crypto', riskLevel: 'HIGH' },
      { merchantId: 'MERCH-02', name: 'Global Wire Vault', category: 'Remittance', riskLevel: 'HIGH' },
      { merchantId: 'MERCH-03', name: 'Metro Supermarket', category: 'Retail', riskLevel: 'LOW' }
    ];

    for (const merch of merchants) {
      await session.run(
        `CREATE (m:Merchant {
          merchantId: $merchantId,
          name: $name,
          category: $category,
          riskLevel: $riskLevel
        })`,
        merch
      );
    }

    // 5. Connect OWNS relationships
    const ownerships = [
      { customerId: 'CUST-101', accountNo: 'ACC-101' },
      { customerId: 'CUST-102', accountNo: 'ACC-102' },
      { customerId: 'CUST-103', accountNo: 'ACC-104' },
      { customerId: 'CUST-104', accountNo: 'ACC-301' },
      { customerId: 'CUST-201', accountNo: 'ACC-401' },
      { customerId: 'CUST-202', accountNo: 'ACC-402' }
    ];

    for (const o of ownerships) {
      await session.run(
        `MATCH (c:Customer {customerId: $customerId})
         MATCH (a:Account {accountNo: $accountNo})
         CREATE (c)-[:OWNS]->(a)`,
        o
      );
    }

    // 6. Connect Customer -> USED_DEVICE & SHARES_PII
    await session.run(`
      MATCH (c1:Customer {customerId: 'CUST-101'}), (d:Device {deviceId: 'DEV-881'})
      CREATE (c1)-[:USED_DEVICE {lastUsed: '2026-08-11'}]->(d)
    `);
    await session.run(`
      MATCH (c2:Customer {customerId: 'CUST-102'}), (d:Device {deviceId: 'DEV-881'})
      CREATE (c2)-[:USED_DEVICE {lastUsed: '2026-08-12'}]->(d)
    `);
    await session.run(`
      MATCH (c1:Customer {customerId: 'CUST-101'}), (c2:Customer {customerId: 'CUST-102'})
      CREATE (c1)-[:SHARES_PII {type: 'SSN', matchedValue: 'XXX-XX-4912'}]->(c2)
    `);

    // 7. Inject Transactions
    // --- RING ALPHA (4-Hop Circular Laundering Loop) ---
    const ringAlphaTx = [
      { from: 'ACC-101', to: 'ACC-102', amount: 25000, timestamp: '2026-08-10T10:00:00Z', txHash: '0x8a7101' },
      { from: 'ACC-102', to: 'ACC-103', amount: 24500, timestamp: '2026-08-10T10:20:00Z', txHash: '0x9b1202' },
      { from: 'ACC-103', to: 'ACC-104', amount: 24000, timestamp: '2026-08-10T10:45:00Z', txHash: '0x1c4403' },
      { from: 'ACC-104', to: 'ACC-101', amount: 23500, timestamp: '2026-08-10T11:15:00Z', txHash: '0x7f9904' }
    ];

    // --- RING BETA (3-Hop Loop) ---
    const ringBetaTx = [
      { from: 'ACC-201', to: 'ACC-202', amount: 15000, timestamp: '2026-08-11T14:00:00Z', txHash: '0xb20101' },
      { from: 'ACC-202', to: 'ACC-203', amount: 14700, timestamp: '2026-08-11T14:30:00Z', txHash: '0xb20202' },
      { from: 'ACC-203', to: 'ACC-202', amount: 14200, timestamp: '2026-08-11T15:10:00Z', txHash: '0xb20303' }
    ];

    // --- MULE CHAIN ALPHA (Multi-hop path) ---
    const muleChainTx = [
      { from: 'ACC-301', to: 'ACC-302', amount: 95000, timestamp: '2026-08-09T08:00:00Z', txHash: '0xm301' },
      { from: 'ACC-302', to: 'ACC-303', amount: 94000, timestamp: '2026-08-09T08:45:00Z', txHash: '0xm302' },
      { from: 'ACC-303', to: 'ACC-304', amount: 92500, timestamp: '2026-08-09T09:30:00Z', txHash: '0xm303' }
    ];

    // --- LEGITIMATE TRANSACTIONS ---
    const noiseTx = [
      { from: 'ACC-401', to: 'ACC-402', amount: 150, timestamp: '2026-08-08T12:00:00Z', txHash: '0xn401' },
      { from: 'ACC-402', to: 'ACC-403', amount: 80, timestamp: '2026-08-08T14:15:00Z', txHash: '0xn402' }
    ];

    const allTx = [...ringAlphaTx, ...ringBetaTx, ...muleChainTx, ...noiseTx];

    for (const tx of allTx) {
      await session.run(
        `MATCH (from:Account {accountNo: $from})
         MATCH (to:Account {accountNo: $to})
         CREATE (from)-[:TRANSFERRED {
           amount: $amount, 
           timestamp: $timestamp, 
           txHash: $txHash
         }]->(to)`,
        tx
      );
    }

    // 8. Connect Merchant Transactions
    await session.run(`
      MATCH (a:Account {accountNo: 'ACC-104'}), (m:Merchant {merchantId: 'MERCH-01'})
      CREATE (a)-[:PAID {amount: 50000, timestamp: '2026-08-11T12:00:00Z'}]->(m)
    `);
    await session.run(`
      MATCH (a:Account {accountNo: 'ACC-304'}), (m:Merchant {merchantId: 'MERCH-02'})
      CREATE (a)-[:PAID {amount: 90000, timestamp: '2026-08-09T11:00:00Z'}]->(m)
    `);

    // Verify seed count
    const countRes = await session.run('MATCH (n) RETURN count(n) AS nodeCount');
    const relRes = await session.run('MATCH ()-[r]->() RETURN count(r) AS relCount');
    const nodeCount = countRes.records[0].get('nodeCount');
    const relCount = relRes.records[0].get('relCount');

    console.log(`✅ Seed Completed Successfully!`);
    console.log(`📊 Summary: Injected ${nodeCount} Nodes and ${relCount} Relationships into CognoDB Cloud.`);
    console.log(`🔁 Fraud Rings Injected: 2 Layering Loops, 1 Synthetic Identity Network, 1 Mule Chain.`);

  } catch (error) {
    console.error('❌ Seed Failed with Error:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
