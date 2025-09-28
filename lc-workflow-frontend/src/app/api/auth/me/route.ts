import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const user = await apiClient.getCurrentUser();
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: error.response?.status || 500 }
    );
  }
}
