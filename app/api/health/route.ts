import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/neo4j';

export async function GET() {
  try {
    const status = await testConnection();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      isMockFallback: true,
      error: error?.message || 'Failed to ping database',
    }, { status: 500 });
  }
}
