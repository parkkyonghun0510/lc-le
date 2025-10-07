import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL.replace(/\/$/, '')}/users/import/csv`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to import CSV', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying CSV import request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
