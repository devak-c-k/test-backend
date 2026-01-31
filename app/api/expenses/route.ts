import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/expenses?user_id=xxx&start_date=xxx&end_date=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:categories(*),
        payment_method:payment_methods(*),
        user_category:user_categories(*)
      `)
      .eq('user_id', userId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      // Ensure we include the full day by setting time to end of day
      const queryEndDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
      query = query.lte('expense_date', queryEndDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API/expenses] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expenses: data });
  } catch (error) {
    console.error('[API/expenses] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/expenses - Create a new transaction (expense or income)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, category_id, user_category_id, payment_method_id, amount, note, expense_date, type } = body;

    // Must have either category_id or user_category_id
    if (!user_id || !payment_method_id || !amount || !expense_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!category_id && !user_category_id) {
      return NextResponse.json({ error: 'Must provide category_id or user_category_id' }, { status: 400 });
    }

    const insertData: any = {
      user_id,
      payment_method_id,
      amount,
      note,
      expense_date,
      type: type || 'expense', // Default to expense
    };

    // Add either category_id or user_category_id (or both if subcategory under system category)
    if (category_id) {
      insertData.category_id = category_id;
    }
    if (user_category_id) {
      insertData.user_category_id = user_category_id;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[API/expenses] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: data }, { status: 201 });
  } catch (error) {
    console.error('[API/expenses] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/expenses?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const expenseId = searchParams.get('id');

  if (!expenseId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('[API/expenses] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/expenses] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
