import { NextRequest, NextResponse } from 'next/server';
import { FinancialAgent } from '../../../lib/agent';

// Helper to iterate the generator and encode text
function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(new TextEncoder().encode(value));
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId, sessionId } = body;

    if (!message || !userId) {
      return NextResponse.json(
        { error: "Missing 'message' or 'userId'" },
        { status: 400 }
      );
    }

    const agent = new FinancialAgent(userId);
    const { stream, sessionId: newSessionId } = await agent.processMessageStream(message, sessionId);

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
    };
    if (newSessionId) {
      headers['x-session-id'] = newSessionId;
    }

    // Return the stream as the response
    return new NextResponse(iteratorToStream(stream), {
      headers,
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
