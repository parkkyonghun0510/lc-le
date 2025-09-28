import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = await apiClient.login({ username, password });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Auth login error:', error);
    return NextResponse.json(
      { error: error.response?.data?.detail || 'Login failed' },
      { status: error.response?.status || 500 }
    );
  }
}
