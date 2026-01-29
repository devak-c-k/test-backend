/**
 * Data Boundary Service
 * Provides the AI agent with structured access to user data
 * Handles all database operations and data formatting
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class UserDataBoundary {
  private supabase: SupabaseClient;
  private clerkId: string;
  private internalUserId: string | null = null;
  private categoriesCache: any[] | null = null;
  private paymentMethodsCache: any[] | null = null;

  constructor(clerkId: string) {
    this.clerkId = clerkId;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async getInternalUserId(): Promise<string> {
    if (this.internalUserId) return this.internalUserId;

    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('clerk_id', this.clerkId)
      .single();

    if (error || !data) {
      throw new Error('User not found in database');
    }

    this.internalUserId = data.id;
    return data.id;
  }

  async getUserProfile(): Promise<any> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('clerk_id', this.clerkId)
      .single();

    if (error) throw new Error(`Failed to get user profile: ${error.message}`);
    return data;
  }

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  async getCategories(categoryType?: 'expense' | 'income'): Promise<any[]> {
    const userId = await this.getInternalUserId();

    let query = this.supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name');

    if (categoryType) {
      query = query.eq('category_type', categoryType);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get categories: ${error.message}`);
    
    this.categoriesCache = data || [];
    return this.categoriesCache;
  }

  async getCategoryByName(name: string): Promise<any | null> {
    // Ensure cache is populated
    if (!this.categoriesCache) {
      await this.getCategories();
    }

    const nameLower = name.toLowerCase().trim();
    
    // Try exact match first
    let match = this.categoriesCache!.find(
      c => c.name.toLowerCase() === nameLower
    );

    if (match) return match;

    // Try partial match
    match = this.categoriesCache!.find(
      c => c.name.toLowerCase().includes(nameLower) || 
           nameLower.includes(c.name.toLowerCase())
    );

    if (match) return match;

    // Common category mappings
    const categoryMappings: Record<string, string> = {
      'food': 'Food & Dining',
      'groceries': 'Food & Dining',
      'grocery': 'Food & Dining',
      'restaurant': 'Food & Dining',
      'eating': 'Food & Dining',
      'lunch': 'Food & Dining',
      'dinner': 'Food & Dining',
      'breakfast': 'Food & Dining',
      'transport': 'Transport',
      'transportation': 'Transport',
      'uber': 'Transport',
      'ola': 'Transport',
      'cab': 'Transport',
      'taxi': 'Transport',
      'fuel': 'Transport',
      'petrol': 'Transport',
      'diesel': 'Transport',
      'bus': 'Transport',
      'metro': 'Transport',
      'train': 'Transport',
      'shopping': 'Shopping',
      'clothes': 'Shopping',
      'amazon': 'Shopping',
      'flipkart': 'Shopping',
      'bills': 'Bills & Utilities',
      'electricity': 'Bills & Utilities',
      'water': 'Bills & Utilities',
      'gas': 'Bills & Utilities',
      'internet': 'Bills & Utilities',
      'wifi': 'Bills & Utilities',
      'phone': 'Bills & Utilities',
      'mobile': 'Bills & Utilities',
      'recharge': 'Bills & Utilities',
      'entertainment': 'Entertainment',
      'movie': 'Entertainment',
      'movies': 'Entertainment',
      'netflix': 'Entertainment',
      'spotify': 'Entertainment',
      'games': 'Entertainment',
      'health': 'Health',
      'medical': 'Health',
      'medicine': 'Health',
      'doctor': 'Health',
      'hospital': 'Health',
      'gym': 'Health',
      'fitness': 'Health',
      'education': 'Education',
      'course': 'Education',
      'books': 'Education',
      'tuition': 'Education',
      'salary': 'Salary',
      'income': 'Other Income',
      'freelance': 'Freelance',
      'investment': 'Investment',
      'rent': 'Rent',
      'personal': 'Personal Care',
      'travel': 'Travel',
      'vacation': 'Travel',
      'flight': 'Travel',
      'hotel': 'Travel',
    };

    const mappedName = categoryMappings[nameLower];
    if (mappedName) {
      match = this.categoriesCache!.find(
        c => c.name.toLowerCase() === mappedName.toLowerCase()
      );
      if (match) return match;
    }

    // Return first category as fallback (usually "Other")
    const otherCategory = this.categoriesCache!.find(
      c => c.name.toLowerCase().includes('other')
    );
    
    return otherCategory || this.categoriesCache![0] || null;
  }

  async getUserCategories(): Promise<any[]> {
    const userId = await this.getInternalUserId();

    const { data, error } = await this.supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get user categories: ${error.message}`);
    return data || [];
  }

  async createUserCategory(params: { name: string; icon?: string; color?: string }): Promise<any> {
    const userId = await this.getInternalUserId();

    const { data, error } = await this.supabase
      .from('user_categories')
      .insert({
        user_id: userId,
        name: params.name,
        icon: params.icon || 'tag',
        color: params.color || '#6B7280',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create category: ${error.message}`);
    
    // Clear cache
    this.categoriesCache = null;
    return data;
  }

  async deleteUserCategory(categoryId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw new Error(`Failed to delete category: ${error.message}`);
    
    this.categoriesCache = null;
    return true;
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  async getPaymentMethods(): Promise<any[]> {
    if (this.paymentMethodsCache) return this.paymentMethodsCache;

    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to get payment methods: ${error.message}`);
    
    this.paymentMethodsCache = data || [];
    return this.paymentMethodsCache;
  }

  async getPaymentMethodByName(name: string): Promise<any | null> {
    if (!this.paymentMethodsCache) {
      await this.getPaymentMethods();
    }

    const nameLower = name.toLowerCase().trim();

    // Try exact match
    let match = this.paymentMethodsCache!.find(
      pm => pm.name.toLowerCase() === nameLower
    );

    if (match) return match;

    // Try partial match
    match = this.paymentMethodsCache!.find(
      pm => pm.name.toLowerCase().includes(nameLower) ||
            nameLower.includes(pm.name.toLowerCase())
    );

    if (match) return match;

    // Common mappings
    const paymentMappings: Record<string, string> = {
      'cash': 'Cash',
      'upi': 'UPI',
      'gpay': 'UPI',
      'phonepe': 'UPI',
      'paytm': 'UPI',
      'credit': 'Credit Card',
      'credit card': 'Credit Card',
      'debit': 'Debit Card',
      'debit card': 'Debit Card',
      'card': 'Debit Card',
      'bank': 'Bank Transfer',
      'transfer': 'Bank Transfer',
      'neft': 'Bank Transfer',
      'imps': 'Bank Transfer',
      'wallet': 'Wallet',
    };

    const mappedName = paymentMappings[nameLower];
    if (mappedName) {
      match = this.paymentMethodsCache!.find(
        pm => pm.name.toLowerCase() === mappedName.toLowerCase()
      );
      if (match) return match;
    }

    // Default to Cash
    return this.paymentMethodsCache!.find(pm => pm.name.toLowerCase() === 'cash') || 
           this.paymentMethodsCache![0] || null;
  }

  // ============================================================================
  // EXPENSE MANAGEMENT
  // ============================================================================

  async getExpenses(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    category?: string;
  } = {}): Promise<any[]> {
    const userId = await this.getInternalUserId();

    let query = this.supabase
      .from('expenses')
      .select(`
        *,
        category:categories(id, name, icon, color),
        payment_method:payment_methods(id, name, icon),
        user_category:user_categories(id, name, icon, color)
      `)
      .eq('user_id', userId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.startDate) {
      query = query.gte('expense_date', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('expense_date', params.endDate);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get expenses: ${error.message}`);

    let expenses = data || [];

    // Filter by category if specified
    if (params.category) {
      const categoryLower = params.category.toLowerCase();
      expenses = expenses.filter(e => {
        const catName = e.user_category?.name || e.category?.name || '';
        return catName.toLowerCase().includes(categoryLower);
      });
    }

    return expenses;
  }

  async getExpenseById(expenseId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        *,
        category:categories(id, name, icon, color),
        payment_method:payment_methods(id, name, icon),
        user_category:user_categories(id, name, icon, color)
      `)
      .eq('id', expenseId)
      .single();

    if (error) return null;
    return data;
  }

  async createExpense(params: {
    amount: number;
    category: string;
    note?: string;
    date?: string;
    payment_method?: string;
    type?: 'expense' | 'income';
  }): Promise<any> {
    const userId = await this.getInternalUserId();

    // Resolve category
    const category = await this.getCategoryByName(params.category);
    if (!category) {
      throw new Error(`Category "${params.category}" not found`);
    }

    // Resolve payment method
    const paymentMethod = await this.getPaymentMethodByName(params.payment_method || 'Cash');
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    const expenseDate = params.date || new Date().toISOString().split('T')[0];

    const insertData: any = {
      user_id: userId,
      amount: params.amount,
      category_id: category.id,
      payment_method_id: paymentMethod.id,
      note: params.note || null,
      expense_date: expenseDate,
      type: params.type || 'expense',
    };

    const { data, error } = await this.supabase
      .from('expenses')
      .insert(insertData)
      .select(`
        *,
        category:categories(id, name, icon, color),
        payment_method:payment_methods(id, name, icon)
      `)
      .single();

    if (error) throw new Error(`Failed to create expense: ${error.message}`);
    return data;
  }

  async updateExpense(expenseId: string, params: {
    amount?: number;
    category?: string;
    note?: string;
    date?: string;
  }): Promise<any> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.amount !== undefined) {
      updates.amount = params.amount;
    }
    if (params.category) {
      const category = await this.getCategoryByName(params.category);
      if (category) {
        updates.category_id = category.id;
      }
    }
    if (params.note !== undefined) {
      updates.note = params.note;
    }
    if (params.date) {
      updates.expense_date = params.date;
    }

    const { data, error } = await this.supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select(`
        *,
        category:categories(id, name, icon, color),
        payment_method:payment_methods(id, name, icon)
      `)
      .single();

    if (error) throw new Error(`Failed to update expense: ${error.message}`);
    return data;
  }

  async deleteExpense(expenseId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw new Error(`Failed to delete expense: ${error.message}`);
    return true;
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getMonthlyStats(year?: number, month?: number): Promise<any> {
    const userId = await this.getInternalUserId();
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const { data: transactions, error } = await this.supabase
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

    if (error) throw new Error(`Failed to get stats: ${error.message}`);

    const allTransactions = transactions || [];
    const expenses = allTransactions.filter(t => t.type === 'expense');
    const incomes = allTransactions.filter(t => t.type === 'income');

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, e) => sum + Number(e.amount), 0);

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const currentDay = targetYear === now.getFullYear() && targetMonth === (now.getMonth() + 1)
      ? now.getDate()
      : daysInMonth;
    const dailyAverage = expenses.length > 0 ? totalSpent / currentDay : 0;

    // Category breakdown
    const categoryTotals: Record<string, { name: string; color: string; total: number }> = {};
    expenses.forEach((e: any) => {
      const cat = e.user_category || e.category;
      if (cat?.name) {
        if (!categoryTotals[cat.name]) {
          categoryTotals[cat.name] = { name: cat.name, color: cat.color || '#6B7280', total: 0 };
        }
        categoryTotals[cat.name].total += Number(e.amount);
      }
    });

    const categoryBreakdown = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    const topCategory = categoryBreakdown[0] || null;

    return {
      year: targetYear,
      month: targetMonth,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netBalance: Math.round((totalIncome - totalSpent) * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0,
      transactionCount: expenses.length,
      incomeTransactionCount: incomes.length,
      topCategory,
      categoryBreakdown,
    };
  }

  // ============================================================================
  // DEBT MANAGEMENT
  // ============================================================================

  async getDebts(params: {
    direction?: 'owed' | 'receivable';
    isPaid?: boolean;
    debtType?: string;
  } = {}): Promise<any[]> {
    const userId = await this.getInternalUserId();

    let query = this.supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (params.direction) {
      query = query.eq('direction', params.direction);
    }
    if (params.isPaid !== undefined) {
      query = query.eq('is_paid', params.isPaid);
    }
    if (params.debtType) {
      query = query.eq('debt_type', params.debtType);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get debts: ${error.message}`);
    return data || [];
  }

  async getDebtById(debtId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .single();

    if (error) return null;
    return data;
  }

  async getDebtByName(name: string): Promise<any | null> {
    const userId = await this.getInternalUserId();
    const nameLower = name.toLowerCase().trim();

    const { data, error } = await this.supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_paid', false);

    if (error || !data) return null;

    // Find matching debt by name
    const match = data.find(d => 
      d.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(d.name.toLowerCase())
    );

    return match || null;
  }

  async createDebt(params: {
    name: string;
    amount: number;
    debt_type: 'rent' | 'loan' | 'subscription' | 'emi' | 'other';
    direction: 'owed' | 'receivable';
    description?: string;
    due_date?: string;
    is_recurring?: boolean;
  }): Promise<any> {
    const userId = await this.getInternalUserId();

    const { data, error } = await this.supabase
      .from('debts')
      .insert({
        user_id: userId,
        name: params.name,
        amount: params.amount,
        debt_type: params.debt_type,
        direction: params.direction,
        description: params.description || null,
        due_date: params.due_date || null,
        is_recurring: params.is_recurring || false,
        reminder_enabled: false,
        reminder_time: '09:00:00',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create debt: ${error.message}`);
    return data;
  }

  async updateDebt(debtId: string, params: {
    name?: string;
    amount?: number;
    description?: string;
    due_date?: string;
  }): Promise<any> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.name) updates.name = params.name;
    if (params.amount !== undefined) updates.amount = params.amount;
    if (params.description !== undefined) updates.description = params.description;
    if (params.due_date !== undefined) updates.due_date = params.due_date;

    const { data, error } = await this.supabase
      .from('debts')
      .update(updates)
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update debt: ${error.message}`);
    return data;
  }

  async deleteDebt(debtId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) throw new Error(`Failed to delete debt: ${error.message}`);
    return true;
  }

  async markDebtPaid(debtId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('debts')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark debt as paid: ${error.message}`);
    return data;
  }

  // ============================================================================
  // REMINDER MANAGEMENT
  // ============================================================================

  async getReminders(includeSent: boolean = false): Promise<any[]> {
    const userId = await this.getInternalUserId();

    let query = this.supabase
      .from('reminders')
      .select('*, debt:debts(*)')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (!includeSent) {
      query = query.eq('is_sent', false);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get reminders: ${error.message}`);
    return data || [];
  }

  async createReminder(params: {
    debt_id: string;
    scheduled_for: string;
  }): Promise<any> {
    const userId = await this.getInternalUserId();

    // Parse relative dates
    let scheduledDate = params.scheduled_for;
    const lowerScheduled = params.scheduled_for.toLowerCase();
    
    if (lowerScheduled === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduledDate = tomorrow.toISOString();
    } else if (lowerScheduled.includes('hour')) {
      const hours = parseInt(lowerScheduled) || 1;
      const date = new Date();
      date.setHours(date.getHours() + hours);
      scheduledDate = date.toISOString();
    }

    const { data, error } = await this.supabase
      .from('reminders')
      .insert({
        debt_id: params.debt_id,
        user_id: userId,
        scheduled_for: scheduledDate,
      })
      .select('*, debt:debts(*)')
      .single();

    if (error) throw new Error(`Failed to create reminder: ${error.message}`);
    return data;
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
    return true;
  }

  // ============================================================================
  // CONTEXT LOADING
  // ============================================================================

  async loadUserContext(): Promise<any> {
    const [categories, paymentMethods, recentExpenses, unpaidDebts, upcomingReminders] = 
      await Promise.all([
        this.getCategories(),
        this.getPaymentMethods(),
        this.getExpenses({ limit: 5 }),
        this.getDebts({ isPaid: false }),
        this.getReminders(),
      ]);

    const stats = await this.getMonthlyStats();

    return {
      categories: categories.map(c => c.name),
      paymentMethods: paymentMethods.map(pm => pm.name),
      recentExpenses: recentExpenses.map(e => ({
        id: e.id,
        amount: e.amount,
        category: e.user_category?.name || e.category?.name,
        note: e.note,
        date: e.expense_date,
        type: e.type,
      })),
      unpaidDebts: unpaidDebts.map(d => ({
        id: d.id,
        name: d.name,
        amount: d.amount,
        type: d.debt_type,
        direction: d.direction,
        dueDate: d.due_date,
      })),
      upcomingReminders: upcomingReminders.map(r => ({
        id: r.id,
        debtName: r.debt?.name,
        scheduledFor: r.scheduled_for,
      })),
      monthlyStats: {
        totalSpent: stats.totalSpent,
        totalIncome: stats.totalIncome,
        netBalance: stats.netBalance,
        topCategory: stats.topCategory?.name,
      },
    };
  }
}
