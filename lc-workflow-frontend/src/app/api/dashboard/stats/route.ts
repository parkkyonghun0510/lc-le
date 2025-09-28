import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const stats = await apiClient.get('/dashboard/stats');
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard stats' },
      { status: error.response?.status || 500 }
    );
  }
}
