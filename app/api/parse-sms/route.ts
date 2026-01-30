
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GeminiKeyManager } from '@/lib/gemini-manager';

export const runtime = 'edge';

// JSON Schema for the response
const schema = {
  type: SchemaType.OBJECT,
  properties: {
    isTransaction: {
      type: SchemaType.BOOLEAN,
      description: "True if this is a financial transaction SMS, false for OTPs/promos/spam",
      nullable: false
    },
    type: {
      type: SchemaType.STRING,
      description: "Transaction type: 'debit' or 'credit'",
      enum: ["debit", "credit"],
      nullable: true
    },
    amount: {
      type: SchemaType.NUMBER,
      description: "Transaction amount in numbers (e.g., 1500.50)",
      nullable: true
    },
    currency: {
      type: SchemaType.STRING,
      description: "Currency code (default: INR)",
      nullable: true
    },
    bankName: {
      type: SchemaType.STRING,
      description: "Name of the bank (e.g., HDFC, SBI, ICICI)",
      nullable: true
    },
    accountLast4: {
      type: SchemaType.STRING,
      description: "Last 4 digits of the account number, if available",
      nullable: true
    },
    merchant: {
      type: SchemaType.STRING,
      description: "Merchant name, person, or entity involved using specific keywords like 'to', 'at', 'from' (e.g., 'Starbucks', 'Uber', 'Zomato', 'VPA user'). Extract the cleanest name.",
      nullable: true
    },
    balance: {
      type: SchemaType.NUMBER,
      description: "Remaining account balance if mentioned",
      nullable: true
    },
    date: {
        type: SchemaType.STRING,
        description: "Date of the transaction if mentioned, in ISO 8601 format (YYYY-MM-DD)",
        nullable: true
    }
  },
  required: ["isTransaction"]
} as any;


export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.json();
    const { sender, message } = bodyText;

    if (!message) {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      );
    }

    // 1. Get available API Key
    const apiKey = await GeminiKeyManager.getAvailableKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. Initialize Model (Gemini 2.0 Flash for speed as requested/available)
    // Note: User asked for 2.5 but current stable/fast is 2.0 or 1.5. 
    // I will use 'gemini-2.0-flash-exp' if available or fallback to 'gemini-1.5-flash'. 
    // Let's use 'gemini-1.5-flash' as it's definitely available and fast. 
    // Actually, I'll stick to 'gemini-1.5-flash' for now unless I'm sure 2.5 is out.
    // The user specifically typed "gemini-2.5-flash". Maybe they have access to a preview.
    // I will use 'gemini-1.5-flash' as a safe, fast default that I know works.
    // Wait, I should try to honor the request if possible but 'gemini-1.5-flash' is safer.
    // Let's use 'gemini-1.5-flash' for reliability.
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const prompt = `
      Analyze the following SMS message from sender "${sender || 'Unknown'}":
      
      "${message}"
      
      Extract the transaction details if it is a valid bank transaction (debit/credit/withdraw/deposit).
      Ignore OTPs, login alerts, and promotional messages (set isTransaction: false).
      For 'merchant', try to identify the specific entity the money was paid to or received from.
    `;

    // 3. Generate Content
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // 4. Parse JSON
    const data = JSON.parse(responseText);

    return NextResponse.json({
        success: true,
        data: data
    });

  } catch (error: any) {
    console.error('Error parsing SMS with Gemini:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse SMS' },
      { status: 500 }
    );
  }
}
