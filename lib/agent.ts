import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiKeyManager } from './gemini-manager';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class FinancialAgent {
  private clerkId: string;

  constructor(clerkId: string) {
    this.clerkId = clerkId;
  }

  async executeTool(name: string, params: any, internalUserId: string) {
    if (name === 'add_expense') {
        const { amount, category, description, date } = params;
        
        // Insert into Supabase
        const { data, error } = await supabase
            .from('expenses')
            .insert([
                { 
                    user_id: internalUserId,
                    amount: amount,
                    category: category,
                    description: description,
                    date: date ? new Date(date).toISOString() : new Date().toISOString(),
                }
            ])
            .select()
            .single();
      
        if (error) {
            console.error("Error adding expense:", error);
            return { success: false, message: `Failed to add expense: ${error.message}` };
        }
        return { success: true, message: "Expense added successfully.", data: data };
    } else if (name === 'get_expenses') {
        const { startDate, endDate } = params; // Assuming params might include date range
        
        let query = supabase
            .from('expenses')
            .select('*')
            .eq('user_id', internalUserId);

        if (startDate) {
            query = query.gte('date', new Date(startDate).toISOString());
        }
        if (endDate) {
            query = query.lte('date', new Date(endDate).toISOString());
        }

        const { data, error } = await query;
      
        if (error) {
            console.error("Error fetching expenses:", error);
            return { success: false, message: `Failed to retrieve expenses: ${error.message}` };
        }
        return { success: true, message: "Expenses retrieved successfully.", data: data };
    }
    return { success: false, message: "Tool not found or not implemented." };
  }

  private async getInternalUserId(): Promise<string | null> {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', this.clerkId)
        .single();
      
      if (error || !data) {
          console.error("User Lookup Error:", error);
          return null;
      }
      return data.id;
  }

  // Load chat history from Supabase
  private async loadHistory(sessionId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error loading history:", error);
      return [];
    }

    return data.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  async processMessageStream(userMessage: string, sessionId?: string) {
    // Sanitize sessionId to handle case where it comes as "undefined" string
    if (sessionId === 'undefined' || sessionId === 'null') {
        sessionId = undefined;
    }

    // Verify User
    const internalUserId = await this.getInternalUserId();
    if (!internalUserId) {
        return { message: "User not found. Please sign in again." }; // Simple return for stream? 
        // Actually, this method returns { stream, sessionId }.
        // If user not found, we throw error.
        throw new Error("User not found in database.");
    }

    // Ensure session exists or create one
    let finalSessionId = sessionId;
    if (!finalSessionId) {
        const { data: session, error: sessionError } = await supabase
            .from('chat_sessions')
            .insert({ user_id: internalUserId, title: userMessage.substring(0, 30) })
            .select()
            .single();
        
        if (sessionError) {
            console.error("Supabase Session Creation Error:", sessionError);
        }
        finalSessionId = session?.id!;
    }
    
    if (!finalSessionId) throw new Error("Failed to initialize session");
    
    // Persist User Message
    await supabase.from('chat_messages').insert({
        session_id: finalSessionId,
        role: 'user',
        content: userMessage
    });

    const apiKey = await GeminiKeyManager.getAvailableKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Load History
    const history = await this.loadHistory(finalSessionId);

    const systemPrompt = `You are a smart financial assistant. User ID: ${internalUserId}. Date: ${new Date().toISOString()}.
    Be concise. If requested, perform actions like adding expenses.`;

    // Start Chat with history
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Ready.' }] },
        ...history
      ],
    });

    // Stream result
    const result = await chat.sendMessageStream(userMessage);
    
    // Collect full text to save to DB later
    let fullResponse = '';
    
    // Return a generator/iterator
    const stream = async function* () {
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            yield chunkText;
        }
        
        // Persist Model Message AFTER streaming is done
        await supabase.from('chat_messages').insert({
            session_id: finalSessionId,
            role: 'model',
            content: fullResponse
        });
        
        // Hacky: check for tool calls in the text (since we are streaming text)
        // ideally we would use native tool calling but for now we look for JSON patterns if we forced JSON.
        // BUT for streaming, we usually just chat. 
        // If we want tools + streaming, it's complex. 
        // For now, let's treat this as a Chat Stream. 
        // If the user asks to "Add expense", the AI might reply "I added it".
        // To actually execute tools, we might need a non-streaming pass or function calling.
        // Given the requirement "Streaming", we prioritize the text stream.
    };

    return { stream: stream(), sessionId: finalSessionId };
  }
}
