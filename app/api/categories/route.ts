import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/categories?user_id=xxx&category_type=expense|income
// Returns system categories (user_id IS NULL) + user's custom categories
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const categoryType = searchParams.get('category_type'); // 'expense' or 'income'

  try {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name');

    // If user_id provided, get system cats + user's custom cats
    // Otherwise just get system categories
    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      query = query.is('user_id', null);
    }

    // Filter by category type if specified
    if (categoryType) {
      query = query.eq('category_type', categoryType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API/categories] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: data });
  } catch (error) {
    console.error('[API/categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - Create a new user category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, name, color, icon } = body;

    if (!user_id || !name) {
      return NextResponse.json({ error: 'user_id and name are required' }, { status: 400 });
    }

    // Check if category with same name already exists for this user
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .or(`user_id.is.null,user_id.eq.${user_id}`)
      .eq('name', name)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id,
        name,
        color: color || '#6B7280',
        icon: icon || 'tag',
      })
      .select()
      .single();

    if (error) {
      console.error('[API/categories] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    console.error('[API/categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('id');

  if (!categoryId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    // Only allow deleting user categories (not system ones)
    const { data: category } = await supabase
      .from('categories')
      .select('user_id')
      .eq('id', categoryId)
      .single();

    if (!category || !category.user_id) {
      return NextResponse.json({ error: 'Cannot delete system category' }, { status: 403 });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('[API/categories] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
