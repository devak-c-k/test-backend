/**
 * Tool definitions for the Financial Agent
 * These are used with Gemini's function calling API
 */

import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

// ============================================================================
// EXPENSE TOOLS
// ============================================================================

export const addExpenseTool: FunctionDeclaration = {
  name: 'add_expense',
  description: 'Add a new expense or income transaction. Use this when the user wants to record a purchase, payment, or any spending. Also use for income when type is set to "income".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      amount: {
        type: SchemaType.NUMBER,
        description: 'The amount of the expense/income in the user\'s currency (e.g., 500, 1299.99)',
      },
      category: {
        type: SchemaType.STRING,
        description: 'The category name (e.g., "Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Salary", "Freelance"). Try to match existing categories.',
      },
      note: {
        type: SchemaType.STRING,
        description: 'Optional description or note about the expense (e.g., "Lunch at cafe", "Monthly grocery")',
      },
      date: {
        type: SchemaType.STRING,
        description: 'The date of the expense in YYYY-MM-DD format. Defaults to today if not specified.',
      },
      payment_method: {
        type: SchemaType.STRING,
        description: 'Payment method used (e.g., "Cash", "UPI", "Credit Card", "Debit Card"). Defaults to "Cash" if not specified.',
      },
      type: {
        type: SchemaType.STRING,
        description: 'Transaction type. Must be either "expense" or "income". Defaults to "expense".',
      },
    },
    required: ['amount', 'category'],
  },
};

export const updateExpenseTool: FunctionDeclaration = {
  name: 'update_expense',
  description: 'Update an existing expense. Use when user wants to modify amount, category, date, or note of a transaction.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      expense_id: {
        type: SchemaType.STRING,
        description: 'The ID of the expense to update',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'New amount (optional)',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category name (optional)',
      },
      note: {
        type: SchemaType.STRING,
        description: 'New note/description (optional)',
      },
      date: {
        type: SchemaType.STRING,
        description: 'New date in YYYY-MM-DD format (optional)',
      },
    },
    required: ['expense_id'],
  },
};

export const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  description: 'Delete an expense. Use when user wants to remove a transaction. Always confirm with user before deleting.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      expense_id: {
        type: SchemaType.STRING,
        description: 'The ID of the expense to delete',
      },
    },
    required: ['expense_id'],
  },
};

export const getExpensesTool: FunctionDeclaration = {
  name: 'get_expenses',
  description: 'Get a list of expenses. Use to show recent transactions, filter by date, or search expenses.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      start_date: {
        type: SchemaType.STRING,
        description: 'Start date for filtering (YYYY-MM-DD format)',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'End date for filtering (YYYY-MM-DD format)',
      },
      limit: {
        type: SchemaType.NUMBER,
        description: 'Maximum number of expenses to return. Default is 10.',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Filter by category name',
      },
    },
    required: [],
  },
};

// ============================================================================
// STATISTICS TOOLS
// ============================================================================

export const getMonthlyStatsTool: FunctionDeclaration = {
  name: 'get_monthly_stats',
  description: 'Get financial statistics for a month including total spent, income, category breakdown, daily average, and savings rate.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      year: {
        type: SchemaType.NUMBER,
        description: 'The year (e.g., 2024). Defaults to current year.',
      },
      month: {
        type: SchemaType.NUMBER,
        description: 'The month (1-12). Defaults to current month.',
      },
    },
    required: [],
  },
};

export const getSpendingByCategoryTool: FunctionDeclaration = {
  name: 'get_spending_by_category',
  description: 'Get spending breakdown by category for analysis. Shows how much was spent in each category.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      year: {
        type: SchemaType.NUMBER,
        description: 'The year (e.g., 2024). Defaults to current year.',
      },
      month: {
        type: SchemaType.NUMBER,
        description: 'The month (1-12). Defaults to current month.',
      },
    },
    required: [],
  },
};

// ============================================================================
// FORECASTING & ANALYSIS TOOLS
// ============================================================================

export const getMultiMonthComparisonTool: FunctionDeclaration = {
  name: 'get_multi_month_comparison',
  description: 'Compare spending and income across multiple months. Use this to find which month had highest/lowest spending, compare trends, analyze patterns over time.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      num_months: {
        type: SchemaType.NUMBER,
        description: 'Number of months to compare (default 6, max 12)',
      },
    },
    required: [],
  },
};

export const getSpendingTrendsTool: FunctionDeclaration = {
  name: 'get_spending_trends',
  description: 'Analyze spending trends over time. Shows month-over-month changes, identifies increasing/decreasing patterns, and highlights unusual spending.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      num_months: {
        type: SchemaType.NUMBER,
        description: 'Number of months to analyze (default 6)',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Optional: analyze trends for a specific category',
      },
    },
    required: [],
  },
};

export const getFinancialForecastTool: FunctionDeclaration = {
  name: 'get_financial_forecast',
  description: 'Predict future savings and spending based on historical data. Use for financial planning, goal setting, and answering questions like "When can I afford X?"',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      forecast_months: {
        type: SchemaType.NUMBER,
        description: 'Number of months to forecast ahead (default 3, max 12)',
      },
      target_savings: {
        type: SchemaType.NUMBER,
        description: 'Optional: A savings target amount to calculate when it can be reached',
      },
    },
    required: [],
  },
};

export const checkAffordabilityTool: FunctionDeclaration = {
  name: 'check_affordability',
  description: 'Check if user can afford a purchase and when. Analyzes current savings rate and predicts when a target amount can be saved. Use for questions like "Can I afford an iPhone?", "When can I buy a car?"',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      item_name: {
        type: SchemaType.STRING,
        description: 'Name of the item user wants to buy',
      },
      item_cost: {
        type: SchemaType.NUMBER,
        description: 'Cost of the item',
      },
      current_savings: {
        type: SchemaType.NUMBER,
        description: 'User current savings (optional, will be estimated from data if not provided)',
      },
    },
    required: ['item_name', 'item_cost'],
  },
};

export const getBudgetRecommendationTool: FunctionDeclaration = {
  name: 'get_budget_recommendation',
  description: 'Get personalized budget recommendations based on spending patterns. Suggests areas to cut spending and how much to save.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      savings_goal_percent: {
        type: SchemaType.NUMBER,
        description: 'Target savings percentage (e.g., 20 for 20%)',
      },
    },
    required: [],
  },
};

// ============================================================================
// DEBT TOOLS
// ============================================================================

export const addDebtTool: FunctionDeclaration = {
  name: 'add_debt',
  description: 'Add a new debt, loan, subscription, or recurring payment. Use for money owed to others, money others owe to you, EMIs, subscriptions like Netflix, rent, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Name or title of the debt (e.g., "Rent", "Netflix", "Loan from Rahul")',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'The amount',
      },
      debt_type: {
        type: SchemaType.STRING,
        description: 'Type of debt. Must be one of: "rent", "loan", "subscription", "emi", "other"',
      },
      direction: {
        type: SchemaType.STRING,
        description: 'Direction of debt. Must be "owed" (money you owe to someone) or "receivable" (money someone owes to you)',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Optional description or notes',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Due date in YYYY-MM-DD format (optional)',
      },
      is_recurring: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this is a recurring debt/subscription',
      },
      reminder_schedule: {
        type: SchemaType.STRING,
        description: 'Schedule for reminders. Options: "once", "daily", "weekly", "monthly". Default: "once" if due_date is set.',
      },
      reminder_time: {
        type: SchemaType.STRING,
        description: 'Time for reminder in HH:MM:SS format. Default: "09:00:00"',
      },
    },
    required: ['name', 'amount', 'debt_type', 'direction'],
  },
};

export const updateDebtTool: FunctionDeclaration = {
  name: 'update_debt',
  description: 'Update an existing debt record.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      debt_id: {
        type: SchemaType.STRING,
        description: 'The ID of the debt to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name (optional)',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'New amount (optional)',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description (optional)',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date (optional)',
      },
    },
    required: ['debt_id'],
  },
};

export const deleteDebtTool: FunctionDeclaration = {
  name: 'delete_debt',
  description: 'Delete a debt record.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      debt_id: {
        type: SchemaType.STRING,
        description: 'The ID of the debt to delete',
      },
    },
    required: ['debt_id'],
  },
};

export const markDebtPaidTool: FunctionDeclaration = {
  name: 'mark_debt_paid',
  description: 'Mark a debt as paid. Use when user says they paid rent, cleared a loan, paid subscription, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      debt_id: {
        type: SchemaType.STRING,
        description: 'The ID of the debt to mark as paid. If not known, search by name first.',
      },
      debt_name: {
        type: SchemaType.STRING,
        description: 'The name of the debt if ID is not known (will search for matching debt)',
      },
    },
    required: [],
  },
};

export const getDebtsTool: FunctionDeclaration = {
  name: 'get_debts',
  description: 'Get list of debts, subscriptions, and recurring payments.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      direction: {
        type: SchemaType.STRING,
        description: 'Filter by direction. Must be "owed" or "receivable"',
      },
      is_paid: {
        type: SchemaType.BOOLEAN,
        description: 'Filter by paid status. false = unpaid only, true = paid only',
      },
      debt_type: {
        type: SchemaType.STRING,
        description: 'Filter by type. Must be one of: "rent", "loan", "subscription", "emi", "other"',
      },
    },
    required: [],
  },
};

// ============================================================================
// REMINDER TOOLS
// ============================================================================

export const createReminderTool: FunctionDeclaration = {
  name: 'create_reminder',
  description: 'Create a reminder for a debt or payment. Use when user wants to be reminded about a payment.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      debt_id: {
        type: SchemaType.STRING,
        description: 'The ID of the debt to create reminder for',
      },
      debt_name: {
        type: SchemaType.STRING,
        description: 'Name of the debt if ID is not known',
      },
      scheduled_for: {
        type: SchemaType.STRING,
        description: 'When to send the reminder in ISO format or relative (e.g., "tomorrow", "2024-01-15T09:00:00")',
      },
    },
    required: ['scheduled_for'],
  },
};

export const deleteReminderTool: FunctionDeclaration = {
  name: 'delete_reminder',
  description: 'Cancel/delete a reminder.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reminder_id: {
        type: SchemaType.STRING,
        description: 'The ID of the reminder to delete',
      },
    },
    required: ['reminder_id'],
  },
};

export const getRemindersTool: FunctionDeclaration = {
  name: 'get_reminders',
  description: 'Get list of upcoming reminders.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      include_sent: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to include already sent reminders',
      },
    },
    required: [],
  },
};

// ============================================================================
// CATEGORY TOOLS
// ============================================================================

export const getCategoriesCool: FunctionDeclaration = {
  name: 'get_categories',
  description: 'Get available expense/income categories.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category_type: {
        type: SchemaType.STRING,
        description: 'Filter by type. Must be "expense" or "income"',
      },
    },
    required: [],
  },
};

export const createUserCategoryTool: FunctionDeclaration = {
  name: 'create_user_category',
  description: 'Create a new custom category for the user.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Name of the new category',
      },
      icon: {
        type: SchemaType.STRING,
        description: 'Icon name (optional, defaults to "tag")',
      },
      color: {
        type: SchemaType.STRING,
        description: 'Color hex code (optional, e.g., "#FF5733")',
      },
    },
    required: ['name'],
  },
};

export const deleteUserCategoryTool: FunctionDeclaration = {
  name: 'delete_user_category',
  description: 'Delete a custom user category.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category_id: {
        type: SchemaType.STRING,
        description: 'The ID of the category to delete',
      },
    },
    required: ['category_id'],
  },
};

// ============================================================================
// PAYMENT METHOD TOOLS
// ============================================================================

export const getPaymentMethodsTool: FunctionDeclaration = {
  name: 'get_payment_methods',
  description: 'Get available payment methods (Cash, UPI, Credit Card, etc.)',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
    required: [],
  },
};

// ============================================================================
// ALL TOOLS EXPORT
// ============================================================================

export const allTools: FunctionDeclaration[] = [
  // Expenses
  addExpenseTool,
  updateExpenseTool,
  deleteExpenseTool,
  getExpensesTool,
  
  // Stats
  getMonthlyStatsTool,
  getSpendingByCategoryTool,
  
  // Forecasting & Analysis
  getMultiMonthComparisonTool,
  getSpendingTrendsTool,
  getFinancialForecastTool,
  checkAffordabilityTool,
  getBudgetRecommendationTool,
  
  // Debts
  addDebtTool,
  updateDebtTool,
  deleteDebtTool,
  markDebtPaidTool,
  getDebtsTool,
  
  // Reminders
  createReminderTool,
  deleteReminderTool,
  getRemindersTool,
  
  // Categories
  getCategoriesCool,
  createUserCategoryTool,
  deleteUserCategoryTool,
  
  // Payment Methods
  getPaymentMethodsTool,
];

export type ToolName = 
  | 'add_expense'
  | 'update_expense'
  | 'delete_expense'
  | 'get_expenses'
  | 'get_monthly_stats'
  | 'get_spending_by_category'
  | 'get_multi_month_comparison'
  | 'get_spending_trends'
  | 'get_financial_forecast'
  | 'check_affordability'
  | 'get_budget_recommendation'
  | 'add_debt'
  | 'update_debt'
  | 'delete_debt'
  | 'mark_debt_paid'
  | 'get_debts'
  | 'create_reminder'
  | 'delete_reminder'
  | 'get_reminders'
  | 'get_categories'
  | 'create_user_category'
  | 'delete_user_category'
  | 'get_payment_methods';

