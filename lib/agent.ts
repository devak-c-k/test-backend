/**
 * Financial Agent with Gemini Function Calling
 * A full-fledged AI agent that can perform actions on user data
 */

import { GoogleGenerativeAI, Content, Part, FunctionCall, FunctionResponsePart } from '@google/generative-ai';
import { GeminiKeyManager } from './gemini-manager';
import { UserDataBoundary } from './data-boundary';
import { allTools, ToolName } from './tools';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Maximum number of function calling loops to prevent infinite loops
const MAX_TOOL_CALLS = 10;

interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
  actionType?: string;
}

export class FinancialAgent {
  private clerkId: string;
  private dataBoundary: UserDataBoundary;

  constructor(clerkId: string) {
    this.clerkId = clerkId;
    this.dataBoundary = new UserDataBoundary(clerkId);
  }

  /**
   * Execute a tool/function call and return the result
   */
  private async executeTool(name: ToolName, params: any): Promise<ToolResult> {
    console.log(`[Agent] Executing tool: ${name}`, params);

    try {
      switch (name) {
        // ==================== EXPENSE TOOLS ====================
        case 'add_expense': {
          const expense = await this.dataBoundary.createExpense({
            amount: params.amount,
            category: params.category,
            note: params.note,
            date: params.date,
            payment_method: params.payment_method,
            type: params.type || 'expense',
          });
          return {
            success: true,
            data: expense,
            message: `Added ${params.type === 'income' ? 'income' : 'expense'} of ₹${params.amount} for ${expense.category?.name || params.category}`,
            actionType: 'expense_added',
          };
        }

        case 'update_expense': {
          const updated = await this.dataBoundary.updateExpense(params.expense_id, {
            amount: params.amount,
            category: params.category,
            note: params.note,
            date: params.date,
          });
          return {
            success: true,
            data: updated,
            message: `Updated expense successfully`,
            actionType: 'expense_updated',
          };
        }

        case 'delete_expense': {
          await this.dataBoundary.deleteExpense(params.expense_id);
          return {
            success: true,
            message: `Deleted expense successfully`,
            actionType: 'expense_deleted',
          };
        }

        case 'get_expenses': {
          const expenses = await this.dataBoundary.getExpenses({
            startDate: params.start_date,
            endDate: params.end_date,
            limit: params.limit || 10,
            category: params.category,
          });
          return {
            success: true,
            data: expenses.map(e => ({
              id: e.id,
              amount: e.amount,
              category: e.user_category?.name || e.category?.name,
              note: e.note,
              date: e.expense_date,
              paymentMethod: e.payment_method?.name,
              type: e.type,
            })),
            message: `Found ${expenses.length} expense(s)`,
          };
        }

        // ==================== STATS TOOLS ====================
        case 'get_monthly_stats': {
          const stats = await this.dataBoundary.getMonthlyStats(params.year, params.month);
          return {
            success: true,
            data: stats,
            message: `Retrieved stats for ${stats.month}/${stats.year}`,
          };
        }

        case 'get_spending_by_category': {
          const stats = await this.dataBoundary.getMonthlyStats(params.year, params.month);
          return {
            success: true,
            data: stats.categoryBreakdown,
            message: `Retrieved category breakdown with ${stats.categoryBreakdown.length} categories`,
          };
        }

        // ==================== DEBT TOOLS ====================
        case 'add_debt': {
          const debt = await this.dataBoundary.createDebt({
            name: params.name,
            amount: params.amount,
            debt_type: params.debt_type,
            direction: params.direction,
            description: params.description,
            due_date: params.due_date,
            is_recurring: params.is_recurring,
          });
          return {
            success: true,
            data: debt,
            message: `Added ${params.debt_type} "${params.name}" of ₹${params.amount}`,
            actionType: 'debt_added',
          };
        }

        case 'update_debt': {
          const updated = await this.dataBoundary.updateDebt(params.debt_id, {
            name: params.name,
            amount: params.amount,
            description: params.description,
            due_date: params.due_date,
          });
          return {
            success: true,
            data: updated,
            message: `Updated debt successfully`,
            actionType: 'debt_updated',
          };
        }

        case 'delete_debt': {
          await this.dataBoundary.deleteDebt(params.debt_id);
          return {
            success: true,
            message: `Deleted debt successfully`,
            actionType: 'debt_deleted',
          };
        }

        case 'mark_debt_paid': {
          let debtId = params.debt_id;
          
          // If no ID provided, try to find by name
          if (!debtId && params.debt_name) {
            const debt = await this.dataBoundary.getDebtByName(params.debt_name);
            if (!debt) {
              return {
                success: false,
                message: `Could not find a debt matching "${params.debt_name}"`,
              };
            }
            debtId = debt.id;
          }

          if (!debtId) {
            return {
              success: false,
              message: 'Please specify which debt to mark as paid',
            };
          }

          const paid = await this.dataBoundary.markDebtPaid(debtId);
          return {
            success: true,
            data: paid,
            message: `Marked "${paid.name}" as paid`,
            actionType: 'debt_paid',
          };
        }

        case 'get_debts': {
          const debts = await this.dataBoundary.getDebts({
            direction: params.direction,
            isPaid: params.is_paid,
            debtType: params.debt_type,
          });
          return {
            success: true,
            data: debts.map(d => ({
              id: d.id,
              name: d.name,
              amount: d.amount,
              type: d.debt_type,
              direction: d.direction,
              dueDate: d.due_date,
              isPaid: d.is_paid,
              isRecurring: d.is_recurring,
            })),
            message: `Found ${debts.length} debt(s)`,
          };
        }

        // ==================== REMINDER TOOLS ====================
        case 'create_reminder': {
          let debtId = params.debt_id;

          // If no debt_id, try to find by name
          if (!debtId && params.debt_name) {
            const debt = await this.dataBoundary.getDebtByName(params.debt_name);
            if (!debt) {
              return {
                success: false,
                message: `Could not find a debt matching "${params.debt_name}"`,
              };
            }
            debtId = debt.id;
          }

          if (!debtId) {
            return {
              success: false,
              message: 'Please specify which debt to create a reminder for',
            };
          }

          const reminder = await this.dataBoundary.createReminder({
            debt_id: debtId,
            scheduled_for: params.scheduled_for,
          });
          return {
            success: true,
            data: reminder,
            message: `Created reminder for "${reminder.debt?.name}" scheduled for ${new Date(reminder.scheduled_for).toLocaleString()}`,
            actionType: 'reminder_created',
          };
        }

        case 'delete_reminder': {
          await this.dataBoundary.deleteReminder(params.reminder_id);
          return {
            success: true,
            message: `Deleted reminder successfully`,
            actionType: 'reminder_deleted',
          };
        }

        case 'get_reminders': {
          const reminders = await this.dataBoundary.getReminders(params.include_sent);
          return {
            success: true,
            data: reminders.map(r => ({
              id: r.id,
              debtName: r.debt?.name,
              debtAmount: r.debt?.amount,
              scheduledFor: r.scheduled_for,
              isSent: r.is_sent,
            })),
            message: `Found ${reminders.length} reminder(s)`,
          };
        }

        // ==================== CATEGORY TOOLS ====================
        case 'get_categories': {
          const categories = await this.dataBoundary.getCategories(params.category_type);
          return {
            success: true,
            data: categories.map(c => ({
              id: c.id,
              name: c.name,
              icon: c.icon,
              color: c.color,
              isSystem: !c.user_id,
            })),
            message: `Found ${categories.length} categories`,
          };
        }

        case 'create_user_category': {
          const category = await this.dataBoundary.createUserCategory({
            name: params.name,
            icon: params.icon,
            color: params.color,
          });
          return {
            success: true,
            data: category,
            message: `Created category "${params.name}"`,
            actionType: 'category_created',
          };
        }

        case 'delete_user_category': {
          await this.dataBoundary.deleteUserCategory(params.category_id);
          return {
            success: true,
            message: `Deleted category successfully`,
            actionType: 'category_deleted',
          };
        }

        // ==================== PAYMENT METHOD TOOLS ====================
        case 'get_payment_methods': {
          const methods = await this.dataBoundary.getPaymentMethods();
          return {
            success: true,
            data: methods.map(pm => ({
              id: pm.id,
              name: pm.name,
              icon: pm.icon,
            })),
            message: `Found ${methods.length} payment methods`,
          };
        }

        default:
          return {
            success: false,
            message: `Unknown tool: ${name}`,
          };
      }
    } catch (error: any) {
      console.error(`[Agent] Tool execution error:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred',
      };
    }
  }

  /**
   * Build system prompt with user context
   */
  private async buildSystemPrompt(): Promise<string> {
    const context = await this.dataBoundary.loadUserContext();
    const now = new Date();

    return `You are a smart financial assistant helping the user manage their expenses, income, debts, and reminders.

CURRENT CONTEXT:
- Date: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${now.toLocaleTimeString('en-IN')}

USER'S FINANCIAL SNAPSHOT:
- This month's spending: ₹${context.monthlyStats.totalSpent}
- This month's income: ₹${context.monthlyStats.totalIncome}
- Net balance: ₹${context.monthlyStats.netBalance}
- Top spending category: ${context.monthlyStats.topCategory || 'N/A'}

AVAILABLE CATEGORIES: ${context.categories.join(', ')}

PAYMENT METHODS: ${context.paymentMethods.join(', ')}

RECENT TRANSACTIONS (last 5):
${context.recentExpenses.map((e: any) => `- ₹${e.amount} on ${e.category} (${e.date})${e.note ? ` - ${e.note}` : ''}`).join('\n') || 'No recent transactions'}

UNPAID DEBTS/SUBSCRIPTIONS:
${context.unpaidDebts.map((d: any) => `- ${d.name}: ₹${d.amount} (${d.type})${d.dueDate ? ` due ${d.dueDate}` : ''}`).join('\n') || 'No unpaid debts'}

UPCOMING REMINDERS:
${context.upcomingReminders.map((r: any) => `- ${r.debtName} at ${new Date(r.scheduledFor).toLocaleString()}`).join('\n') || 'No upcoming reminders'}

INSTRUCTIONS:
1. Use the available tools to perform actions the user requests
2. Be helpful and conversational
3. When adding expenses, match categories intelligently (e.g., "coffee" -> "Food & Dining")
4. For dates, interpret natural language (e.g., "yesterday", "last Monday")
5. Always confirm successful actions
6. If unsure, ask for clarification
7. Use ₹ for currency (Indian Rupees)
8. Keep responses concise but informative`;
  }

  /**
   * Load chat history from database
   */
  private async loadHistory(sessionId: string): Promise<Content[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Agent] Error loading history:', error);
      return [];
    }

    return data.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }] as Part[],
    }));
  }

  /**
   * Save message to chat history
   */
  private async saveMessage(sessionId: string, role: 'user' | 'model', content: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
      });

    if (error) {
      console.error('[Agent] Error saving message:', error);
    }
  }

  /**
   * Process user message with streaming and function calling
   */
  async processMessageStream(userMessage: string, sessionId?: string): Promise<{
    stream: AsyncGenerator<string, void, unknown>;
    sessionId: string;
  }> {
    // Validate session ID
    if (sessionId === 'undefined' || sessionId === 'null') {
      sessionId = undefined;
    }

    // Verify user exists
    const internalUserId = await this.dataBoundary.getInternalUserId();

    // Create or get session
    let finalSessionId = sessionId;
    if (!finalSessionId) {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({ 
          user_id: internalUserId, 
          title: userMessage.substring(0, 50) 
        })
        .select()
        .single();

      if (error) {
        console.error('[Agent] Session creation error:', error);
        throw new Error('Failed to create session');
      }
      finalSessionId = session.id;
    }

    // Ensure we have a valid session ID
    if (!finalSessionId) {
      throw new Error('Failed to get or create session');
    }

    // Save user message
    await this.saveMessage(finalSessionId, 'user', userMessage);

    // Get API key and initialize model
    const apiKey = await GeminiKeyManager.getAvailableKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations: allTools }],
    });

    // Load history and build prompt
    const history = await this.loadHistory(finalSessionId!);
    const systemPrompt = await this.buildSystemPrompt();

    // Start chat
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I\'m ready to help you manage your finances. How can I assist you today?' }] },
        ...history.slice(-20), // Keep last 20 messages for context
      ],
    });

    const sessionIdCapture = finalSessionId;
    const self = this;

    // Create async generator for streaming
    async function* generateStream(): AsyncGenerator<string, void, unknown> {
      let toolCallCount = 0;
      let currentResponse = await chat.sendMessage(userMessage);
      let fullResponse = '';

      while (toolCallCount < MAX_TOOL_CALLS) {
        const response = currentResponse.response;
        const candidate = response.candidates?.[0];

        if (!candidate) break;

        // Check for function calls
        const functionCalls = candidate.content.parts?.filter(
          (part): part is Part & { functionCall: FunctionCall } => 'functionCall' in part
        );

        if (functionCalls && functionCalls.length > 0) {
          // Execute all function calls
          const functionResponses: FunctionResponsePart[] = [];

          for (const part of functionCalls) {
            const { name, args } = part.functionCall;
            toolCallCount++;

            console.log(`[Agent] Tool call ${toolCallCount}: ${name}`);
            
            // Show user what we're doing
            yield `\n*Processing: ${name.replace(/_/g, ' ')}...*\n`;

            const result = await self.executeTool(name as ToolName, args);

            functionResponses.push({
              functionResponse: {
                name,
                response: result,
              },
            });

            // If there's an action result, notify user
            if (result.actionType) {
              yield `✓ ${result.message}\n`;
            }
          }

          // Send function responses back to model
          currentResponse = await chat.sendMessage(functionResponses);
        } else {
          // No function calls, get text response
          const text = response.text();
          if (text) {
            fullResponse += text;
            yield text;
          }
          break;
        }
      }

      // Save the final response
      if (fullResponse && sessionIdCapture) {
        await self.saveMessage(sessionIdCapture, 'model', fullResponse);
      }
    }

    return {
      stream: generateStream(),
      sessionId: finalSessionId!,
    };
  }

  /**
   * Process message without streaming (for non-streaming clients)
   */
  async processMessage(userMessage: string, sessionId?: string): Promise<{
    response: string;
    sessionId: string;
    actions: string[];
  }> {
    const { stream, sessionId: newSessionId } = await this.processMessageStream(userMessage, sessionId);
    
    let fullResponse = '';
    const actions: string[] = [];

    for await (const chunk of stream) {
      fullResponse += chunk;
      
      // Extract action confirmations
      if (chunk.startsWith('✓ ')) {
        actions.push(chunk.replace('✓ ', '').trim());
      }
    }

    return {
      response: fullResponse,
      sessionId: newSessionId,
      actions,
    };
  }
}
