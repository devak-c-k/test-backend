import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// GET /api/stats/months?userId=xxx
// Returns all months that have expense data for a user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Get distinct months that have expenses
    const { data, error } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('user_id', userId)
      .order('expense_date', { ascending: true });

    if (error) {
      console.error('Error fetching expense dates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract unique months
    const monthsSet = new Set<string>();
    (data || []).forEach((expense: { expense_date: string }) => {
      const date = new Date(expense.expense_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(key);
    });

    // Convert to array of month objects
    const months = Array.from(monthsSet).map(key => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        year,
        month,
        label: date.toLocaleString('default', { month: 'short' }),
        key,
      };
    }).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Always include current month even if no data
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const hasCurrentMonth = months.some(m => m.key === currentKey);
    
    if (!hasCurrentMonth) {
      months.push({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        label: now.toLocaleString('default', { month: 'short' }),
        key: currentKey,
      });
    }

    return NextResponse.json({ months });
  } catch (error) {
    console.error('Error in months API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
