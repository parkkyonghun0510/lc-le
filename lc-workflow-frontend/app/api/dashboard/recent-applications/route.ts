import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '5';
    const todayOnly = searchParams.get('today_only') || 'true';

    const applications = await apiClient.get(`/dashboard/recent-applications?limit=${limit}&today_only=${todayOnly}`);
    return NextResponse.json(applications);
  } catch (error: any) {
    console.error('Recent applications error:', error);
    return NextResponse.json(
      { error: 'Failed to get recent applications' },
      { status: error.response?.status || 500 }
    );
  }
}
