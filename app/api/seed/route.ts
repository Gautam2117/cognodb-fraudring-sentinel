import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/neo4j';

export async function POST() {
  try {
    const status = await testConnection();

    if (!status.connected) {
      return NextResponse.json({
        success: false,
        message: 'CognoDB database not connected. Please configure COGNO_URI and COGNO_PASSWORD in .env.local first.',
      }, { status: 400 });
    }

    // Trigger seed logic using node process or seed script execution
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);

    const { stdout, stderr } = await execPromise('npx tsx scripts/seed.ts');

    return NextResponse.json({
      success: true,
      message: 'CognoDB instance successfully seeded with Financial Crime dataset!',
      stdout,
      stderr,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to execute seed script',
    }, { status: 500 });
  }
}
