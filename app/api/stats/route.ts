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

    // Fetch all transactions for the month
    const { data: allTransactions, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        type,
        expense_date,
        category:categories(name, color),
        user_category:user_categories(name, color)
      `)
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transactions = allTransactions || [];
    
    // Separate expenses and income
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    // Calculate expense totals
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, e) => sum + Number(e.amount), 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = year === new Date().getFullYear() && month === new Date().getMonth() + 1 
      ? new Date().getDate() 
      : daysInMonth;
    const dailyAverage = expenses.length > 0 ? totalSpent / currentDay : 0;

    // Group expenses by category
    const categoryTotals: Record<string, { name: string; color: string; total: number }> = {};
    expenses.forEach((e) => {
      // Use user_category if available, otherwise use system category
      const cat = e.user_category as unknown as { name: string; color: string } || 
                  e.category as unknown as Category;
      if (cat && cat.name) {
        if (!categoryTotals[cat.name]) {
          categoryTotals[cat.name] = { name: cat.name, color: cat.color || '#6B7280', total: 0 };
        }
        categoryTotals[cat.name].total += Number(e.amount);
      }
    });

    // Group income by category
    const incomeCategoryTotals: Record<string, { name: string; color: string; total: number }> = {};
    incomes.forEach((e) => {
      const cat = e.user_category as unknown as { name: string; color: string } || 
                  e.category as unknown as Category;
      if (cat && cat.name) {
        if (!incomeCategoryTotals[cat.name]) {
          incomeCategoryTotals[cat.name] = { name: cat.name, color: cat.color || '#10B981', total: 0 };
        }
        incomeCategoryTotals[cat.name].total += Number(e.amount);
      }
    });

    const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0] || null;
    const topIncomeCategory = Object.values(incomeCategoryTotals).sort((a, b) => b.total - a.total)[0] || null;

    return NextResponse.json({
      stats: {
        // Expense stats
        totalSpent,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        topCategory,
        categoryBreakdown: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
        transactionCount: expenses.length,
        
        // Income stats  
        totalIncome,
        topIncomeCategory,
        incomeCategoryBreakdown: Object.values(incomeCategoryTotals).sort((a, b) => b.total - a.total),
        incomeTransactionCount: incomes.length,
        
        // Net
        netBalance: totalIncome - totalSpent,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('[API/stats] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
