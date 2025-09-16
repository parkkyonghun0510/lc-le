import { NextRequest, NextResponse } from 'next/server';

interface UserRegistrationData {
  name: string;
  email: string;
  phone: string;
  address: {
    province_code?: string;
    district_code?: string;
    commune_code?: string;
    village_code?: string;
    full_address_km?: string;
    full_address_en?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const userData: UserRegistrationData = await request.json();

    // Validate required fields
    if (!userData.name || !userData.email || !userData.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate address completeness
    if (!userData.address.village_code) {
      return NextResponse.json(
        { error: 'Complete address is required (Province, District, Commune, Village)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Save to database
    // 2. Send confirmation email
    // 3. Log the registration
    
    console.log('User registration data:', {
      ...userData,
      timestamp: new Date().toISOString()
    });

    // Simulate database save
    const userId = `user_${Date.now()}`;
    
    // Mock response
    const response = {
      success: true,
      message: 'User registered successfully',
      user: {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: {
          codes: {
            province: userData.address.province_code,
            district: userData.address.district_code,
            commune: userData.address.commune_code,
            village: userData.address.village_code,
          },
          display: {
            khmer: userData.address.full_address_km,
            english: userData.address.full_address_en,
          }
        },
        created_at: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle GET request to retrieve user data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  // Mock user data retrieval
  const mockUser = {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+855123456789',
    address: {
      codes: {
        province: '01',
        district: '0102',
        commune: '010201',
        village: '01020101',
      },
      display: {
        khmer: 'អូរធំ, បន្ទាយនាង, មង្គលបូរី, បន្ទាយមានជ័យ',
        english: 'Ou Thum, Banteay Neang, Mongkol Borei, Banteay Meanchey',
      }
    },
    created_at: '2024-01-01T00:00:00.000Z'
  };

  return NextResponse.json({ user: mockUser });
}