import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debts?user_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const direction = searchParams.get('direction'); // 'owed' or 'receivable'
  const isPaid = searchParams.get('is_paid');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (direction) {
      query = query.eq('direction', direction);
    }
    if (isPaid !== null) {
      query = query.eq('is_paid', isPaid === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ debts: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/debts - Create a new debt
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      name,
      description,
      amount,
      debt_type,
      direction,
      due_date,
      is_recurring,
      reminder_enabled,
      reminder_schedule,
      reminder_day_of_week,
      reminder_day_of_month,
      reminder_time,
    } = body;

    if (!user_id || !name || !amount || !debt_type || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id,
        name,
        description,
        amount,
        debt_type,
        direction,
        due_date,
        is_recurring: is_recurring || false,
        reminder_enabled: reminder_enabled || false,
        reminder_schedule,
        reminder_day_of_week,
        reminder_day_of_month,
        reminder_time: reminder_time || '09:00:00',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ debt: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/debts - Update a debt
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ debt: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/debts?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const debtId = searchParams.get('id');

  if (!debtId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
