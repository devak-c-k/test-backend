import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/users?clerk_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clerkId = searchParams.get('clerk_id');

  if (!clerkId) {
    return NextResponse.json({ error: 'clerk_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API/users GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('[API/users GET] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create or update a user (upsert)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerk_id, email, name, push_token } = body;

    console.log('[API/users POST] Creating/updating user:', { clerk_id, email, name });

    if (!clerk_id) {
      return NextResponse.json({ error: 'clerk_id is required' }, { status: 400 });
    }

    // First check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerk_id)
      .single();

    if (existingUser) {
      console.log('[API/users POST] User already exists:', existingUser.id);
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({ email, name, push_token, updated_at: new Date().toISOString() })
        .eq('clerk_id', clerk_id)
        .select()
        .single();

      if (error) {
        console.error('[API/users POST] Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ user: data, created: false });
    }

    // Create new user
    console.log('[API/users POST] Creating new user');
    const { data, error } = await supabase
      .from('users')
      .insert({ clerk_id, email, name, push_token })
      .select()
      .single();

    if (error) {
      console.error('[API/users POST] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API/users POST] User created:', data.id);
    return NextResponse.json({ user: data, created: true }, { status: 201 });
  } catch (error) {
    console.error('[API/users POST] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users - Update specific fields (like push_token) by ID
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, push_token } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ push_token, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API/users PUT] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('[API/users PUT] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
