import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL.replace(/\/$/, '')}/users/export/csv${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to export CSV', details: errorText },
        { status: response.status }
      );
    }

    // Return the CSV file as a response
    const csvContent = await response.text();
    const filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error('Error proxying CSV export request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
