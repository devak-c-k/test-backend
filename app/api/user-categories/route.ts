import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/user-categories?user_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/user-categories] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Organize into parent categories and subcategories
    const parentCategories = data.filter(c => !c.parent_id);
    const subcategories = data.filter(c => c.parent_id);

    const organized = parentCategories.map(parent => ({
      ...parent,
      subcategories: subcategories.filter(sub => sub.parent_id === parent.id)
    }));

    return NextResponse.json({ categories: organized, all: data });
  } catch (error) {
    console.error('[API/user-categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user-categories - Create a new custom category (subcategory)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, name, parent_id, category_id, icon, color } = body;

    if (!user_id || !name) {
      return NextResponse.json({ error: 'user_id and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_categories')
      .insert({
        user_id,
        name,
        parent_id: parent_id || null,
        category_id: category_id || null,
        icon: icon || 'tag',
        color: color || '#6B7280',
      })
      .select()
      .single();

    if (error) {
      console.error('[API/user-categories] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    console.error('[API/user-categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user-categories?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('user_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API/user-categories] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/user-categories] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
