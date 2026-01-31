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
    reminder_schedule?: 'once' | 'daily' | 'weekly' | 'monthly';
    reminder_time?: string;
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
        reminder_enabled: !!params.reminder_schedule || false,
        reminder_schedule: params.reminder_schedule || 'once',
        reminder_time: params.reminder_time || '09:00:00',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create debt: ${error.message}`);

    // If reminder is enabled and we have a due date, create the initial reminder
    if (params.reminder_schedule && params.due_date) {
      try {
        let scheduledFor = params.due_date;
        const time = params.reminder_time || '09:00:00';
        
        // Combine date and time
        if (!scheduledFor.includes('T')) {
          scheduledFor = `${scheduledFor}T${time}`;
        }

        await this.createReminder({
          debt_id: data.id,
          scheduled_for: scheduledFor,
        });
      } catch (e) {
        console.error('Failed to create initial reminder:', e);
        // Don't fail the whole operation
      }
    }

    return data;
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private async scheduleWithQStash(reminder: any) {
    const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
    const QSTASH_URL = process.env.QSTASH_URL || 'https://qstash.upstash.io';
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    if (!QSTASH_TOKEN) {
      console.warn('[QStash] Token is missing, skipping scheduling');
      return;
    }

    try {
      const scheduledTime = new Date(reminder.scheduled_for).getTime();
      const delay = Math.max(0, Math.floor((scheduledTime - Date.now()) / 1000));
      
      console.log(`[QStash] Scheduling reminder for ${reminder.scheduled_for}. Delay: ${delay}s`);

      const qstashUrl = `${QSTASH_URL}/v2/publish/${WEBHOOK_URL}/api/webhooks/reminder`;
      
      const response = await fetch(qstashUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${QSTASH_TOKEN}`,
          'Content-Type': 'application/json',
          'Upstash-Delay': `${delay}s`,
        },
        body: JSON.stringify({
          reminder_id: reminder.id,
          debt_id: reminder.debt_id,
          user_id: reminder.user_id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update reminder with message ID
        await this.supabase
          .from('reminders')
          .update({ qstash_message_id: data.messageId })
          .eq('id', reminder.id);
          
        console.log('[QStash] Scheduled successfully:', data.messageId);
      } else {
        console.error('[QStash] Failed to schedule:', await response.text());
      }
    } catch (error) {
      console.error('[QStash] Scheduling error:', error);
    }
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
    
    // Schedule with QStash
    await this.scheduleWithQStash(data);
    
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
  // FORECASTING & ANALYSIS
  // ============================================================================

  async getMultiMonthComparison(numMonths: number = 6): Promise<any> {
    const months = Math.min(Math.max(numMonths, 2), 12);
    const monthlyData: any[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      try {
        const stats = await this.getMonthlyStats(year, month);
        monthlyData.push({
          year,
          month,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
          totalSpent: stats.totalSpent,
          totalIncome: stats.totalIncome,
          netBalance: stats.netBalance,
          savingsRate: stats.savingsRate,
          transactionCount: stats.transactionCount,
          topCategory: stats.topCategory?.name || 'N/A',
        });
      } catch (e) {
        // Skip months with errors
      }
    }

    // Calculate insights
    const validMonths = monthlyData.filter(m => m.totalSpent > 0 || m.totalIncome > 0);
    
    if (validMonths.length === 0) {
      return { 
        months: [], 
        insights: { message: 'No data available for analysis' } 
      };
    }

    const highestSpending = validMonths.reduce((max, m) => m.totalSpent > max.totalSpent ? m : max, validMonths[0]);
    const lowestSpending = validMonths.filter(m => m.totalSpent > 0).reduce((min, m) => m.totalSpent < min.totalSpent ? m : min, validMonths[0]);
    const avgSpending = validMonths.reduce((sum, m) => sum + m.totalSpent, 0) / validMonths.length;
    const avgIncome = validMonths.reduce((sum, m) => sum + m.totalIncome, 0) / validMonths.length;
    const avgSavingsRate = validMonths.reduce((sum, m) => sum + m.savingsRate, 0) / validMonths.length;

    return {
      months: monthlyData.reverse(), // Chronological order
      insights: {
        highestSpendingMonth: {
          month: highestSpending.monthName,
          amount: highestSpending.totalSpent,
        },
        lowestSpendingMonth: {
          month: lowestSpending.monthName,
          amount: lowestSpending.totalSpent,
        },
        averageMonthlySpending: Math.round(avgSpending),
        averageMonthlyIncome: Math.round(avgIncome),
        averageSavingsRate: Math.round(avgSavingsRate),
        totalPeriodSpending: validMonths.reduce((sum, m) => sum + m.totalSpent, 0),
        totalPeriodIncome: validMonths.reduce((sum, m) => sum + m.totalIncome, 0),
      },
    };
  }

  async getSpendingTrends(numMonths: number = 6, category?: string): Promise<any> {
    const comparison = await this.getMultiMonthComparison(numMonths);
    const months = comparison.months;

    if (months.length < 2) {
      return { 
        trends: [],
        analysis: { message: 'Need at least 2 months of data for trend analysis' }
      };
    }

    // Calculate month-over-month changes
    const trends = months.slice(1).map((month: any, index: number) => {
      const prevMonth = months[index];
      const spendingChange = month.totalSpent - prevMonth.totalSpent;
      const spendingChangePercent = prevMonth.totalSpent > 0 
        ? Math.round((spendingChange / prevMonth.totalSpent) * 100) 
        : 0;

      return {
        month: month.monthName,
        totalSpent: month.totalSpent,
        spendingChange,
        spendingChangePercent,
        direction: spendingChange > 0 ? 'increased' : spendingChange < 0 ? 'decreased' : 'stable',
      };
    });

    // Determine overall trend
    const recentTrends = trends.slice(-3);
    const increasingCount = recentTrends.filter((t: any) => t.direction === 'increased').length;
    const decreasingCount = recentTrends.filter((t: any) => t.direction === 'decreased').length;
    
    let overallTrend = 'stable';
    if (increasingCount >= 2) overallTrend = 'increasing';
    if (decreasingCount >= 2) overallTrend = 'decreasing';

    // Find unusual months (spending > 1.5x average)
    const avgSpending = months.reduce((sum: number, m: any) => sum + m.totalSpent, 0) / months.length;
    const unusualMonths = months.filter((m: any) => m.totalSpent > avgSpending * 1.5);

    return {
      trends,
      analysis: {
        overallTrend,
        averageSpending: Math.round(avgSpending),
        unusualMonths: unusualMonths.map((m: any) => ({
          month: m.monthName,
          amount: m.totalSpent,
          percentAboveAverage: Math.round(((m.totalSpent - avgSpending) / avgSpending) * 100),
        })),
        recommendation: overallTrend === 'increasing' 
          ? 'Your spending is trending upward. Consider reviewing your expenses to identify areas to cut back.'
          : overallTrend === 'decreasing'
          ? 'Great job! Your spending is trending downward. Keep up the good work!'
          : 'Your spending is relatively stable.',
      },
    };
  }

  async getFinancialForecast(forecastMonths: number = 3, targetSavings?: number): Promise<any> {
    const comparison = await this.getMultiMonthComparison(6);
    const months = comparison.months;

    if (months.length < 2) {
      return { 
        forecast: [],
        message: 'Need more historical data for accurate forecasting'
      };
    }

    // Calculate averages from historical data
    const avgIncome = months.reduce((sum: number, m: any) => sum + m.totalIncome, 0) / months.length;
    const avgSpending = months.reduce((sum: number, m: any) => sum + m.totalSpent, 0) / months.length;
    const avgMonthlySavings = avgIncome - avgSpending;

    // Generate forecast
    const forecast = [];
    let cumulativeSavings = 0;
    const now = new Date();

    for (let i = 1; i <= Math.min(forecastMonths, 12); i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      cumulativeSavings += avgMonthlySavings;

      forecast.push({
        month: forecastDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        projectedIncome: Math.round(avgIncome),
        projectedSpending: Math.round(avgSpending),
        projectedSavings: Math.round(avgMonthlySavings),
        cumulativeSavings: Math.round(cumulativeSavings),
      });
    }

    // Calculate time to reach target savings
    let monthsToTarget = null;
    if (targetSavings && avgMonthlySavings > 0) {
      monthsToTarget = Math.ceil(targetSavings / avgMonthlySavings);
    }

    return {
      forecast,
      summary: {
        averageMonthlyIncome: Math.round(avgIncome),
        averageMonthlySpending: Math.round(avgSpending),
        averageMonthlySavings: Math.round(avgMonthlySavings),
        projectedSavingsIn3Months: Math.round(avgMonthlySavings * 3),
        projectedSavingsIn6Months: Math.round(avgMonthlySavings * 6),
        projectedSavingsIn12Months: Math.round(avgMonthlySavings * 12),
        monthsToTargetSavings: monthsToTarget,
        savingsRate: avgIncome > 0 ? Math.round((avgMonthlySavings / avgIncome) * 100) : 0,
      },
    };
  }

  async checkAffordability(itemName: string, itemCost: number, currentSavings?: number): Promise<any> {
    const forecast = await this.getFinancialForecast(12);
    const avgMonthlySavings = forecast.summary.averageMonthlySavings;
    const currentStats = await this.getMonthlyStats();

    // Estimate current savings (use provided or calculate)
    const estimatedCurrentSavings = currentSavings || currentStats.netBalance;

    // Calculate affordability
    const canAffordNow = estimatedCurrentSavings >= itemCost;
    const remainingAmount = itemCost - estimatedCurrentSavings;
    
    let monthsNeeded = 0;
    let targetDate = null;

    if (!canAffordNow && avgMonthlySavings > 0) {
      monthsNeeded = Math.ceil(remainingAmount / avgMonthlySavings);
      targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
    }

    // Suggest ways to afford it faster
    const suggestions = [];
    if (!canAffordNow) {
      if (currentStats.categoryBreakdown && currentStats.categoryBreakdown.length > 0) {
        const topSpending = currentStats.categoryBreakdown[0];
        suggestions.push(`Reduce ${topSpending.name} spending by 20% to save ₹${Math.round(topSpending.total * 0.2)} more per month`);
      }
      if (avgMonthlySavings < itemCost * 0.1) {
        suggestions.push('Consider setting a specific savings goal for this purchase');
      }
      if (monthsNeeded > 6) {
        suggestions.push('Consider a small monthly transfer to a dedicated savings account');
      }
    }

    return {
      item: itemName,
      cost: itemCost,
      currentSavings: Math.round(estimatedCurrentSavings),
      canAffordNow,
      remainingAmount: Math.max(0, Math.round(remainingAmount)),
      monthsNeeded: canAffordNow ? 0 : monthsNeeded,
      targetDate: targetDate ? targetDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : null,
      monthlySavingsRate: avgMonthlySavings,
      affordabilityAnalysis: canAffordNow 
        ? `You can afford the ${itemName} right now!`
        : avgMonthlySavings <= 0
        ? `At your current spending rate, you're not saving money. Consider reducing expenses.`
        : `At your current savings rate of ₹${Math.round(avgMonthlySavings)}/month, you can afford the ${itemName} in ${monthsNeeded} month(s) (by ${targetDate?.toLocaleString('default', { month: 'long', year: 'numeric' })}).`,
      suggestions,
    };
  }

  async getBudgetRecommendation(savingsGoalPercent?: number): Promise<any> {
    const comparison = await this.getMultiMonthComparison(3);
    const currentStats = await this.getMonthlyStats();
    
    const avgIncome = comparison.insights.averageMonthlyIncome || currentStats.totalIncome;
    const avgSpending = comparison.insights.averageMonthlySpending || currentStats.totalSpent;
    const targetSavingsPercent = savingsGoalPercent || 20; // Default 20%

    const targetSavings = avgIncome * (targetSavingsPercent / 100);
    const currentSavings = avgIncome - avgSpending;
    const additionalSavingsNeeded = targetSavings - currentSavings;

    // Category-based recommendations
    const recommendations = [];
    const categoryBreakdown = currentStats.categoryBreakdown || [];

    if (additionalSavingsNeeded > 0 && categoryBreakdown.length > 0) {
      // Find categories where we can cut
      const discretionaryCategories = ['Entertainment', 'Shopping', 'Food & Dining', 'Personal Care'];
      
      for (const cat of categoryBreakdown) {
        if (discretionaryCategories.some(d => cat.name.includes(d))) {
          const potentialSaving = cat.total * 0.2; // 20% reduction
          recommendations.push({
            category: cat.name,
            currentSpending: cat.total,
            suggestedReduction: Math.round(potentialSaving),
            suggestedBudget: Math.round(cat.total - potentialSaving),
            tip: `Reduce ${cat.name} spending by 20% to save ₹${Math.round(potentialSaving)}/month`,
          });
        }
      }
    }

    return {
      currentFinancials: {
        averageIncome: Math.round(avgIncome),
        averageSpending: Math.round(avgSpending),
        currentSavingsRate: avgIncome > 0 ? Math.round((currentSavings / avgIncome) * 100) : 0,
        currentMonthlySavings: Math.round(currentSavings),
      },
      targetFinancials: {
        targetSavingsRate: targetSavingsPercent,
        targetMonthlySavings: Math.round(targetSavings),
        targetSpendingLimit: Math.round(avgIncome - targetSavings),
        additionalSavingsNeeded: Math.round(Math.max(0, additionalSavingsNeeded)),
      },
      recommendations,
      overallAdvice: additionalSavingsNeeded <= 0
        ? `Great job! You're already meeting or exceeding your ${targetSavingsPercent}% savings goal.`
        : `To reach your ${targetSavingsPercent}% savings goal, you need to save an additional ₹${Math.round(additionalSavingsNeeded)}/month.`,
    };
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
