import { NextResponse } from 'next/server';
import { supabase, Category } from '@/lib/supabase';

// GET /api/stats?user_id=xxx&year=xxx&month=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        expense_date,
        category:categories(name, color)
      `)
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const expenseList = expenses || [];
    const totalSpent = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyAverage = totalSpent / daysInMonth;

    // Group by category
    const categoryTotals: Record<string, { name: string; color: string; total: number }> = {};
    expenseList.forEach((e) => {
      const cat = e.category as unknown as Category;
      if (!categoryTotals[cat.name]) {
        categoryTotals[cat.name] = { name: cat.name, color: cat.color, total: 0 };
      }
      categoryTotals[cat.name].total += Number(e.amount);
    });

    const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0] || null;

    return NextResponse.json({
      stats: {
        totalSpent,
        dailyAverage,
        topCategory,
        categoryBreakdown: Object.values(categoryTotals),
        transactionCount: expenseList.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
