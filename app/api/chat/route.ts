import { NextRequest, NextResponse } from 'next/server';
import { FinancialAgent } from '../../../lib/agent';

// Helper to iterate the generator and encode text
function iteratorToStream(iterator: AsyncGenerator<string, void, unknown>) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(new TextEncoder().encode(value));
        }
      } catch (error) {
        console.error('[Chat Stream] Error:', error);
        controller.error(error);
      }
    },
    cancel() {
      // Handle stream cancellation if needed
      console.log('[Chat Stream] Stream cancelled by client');
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId, sessionId, stream: useStream = true } = body;

    if (!message || !userId) {
      return NextResponse.json(
        { error: "Missing 'message' or 'userId'" },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Processing message for user ${userId}: "${message.substring(0, 50)}..."`);

    const agent = new FinancialAgent(userId);

    // Support both streaming and non-streaming responses
    if (useStream === false) {
      // Non-streaming response
      const result = await agent.processMessage(message, sessionId);
      
      return NextResponse.json({
        response: result.response,
        sessionId: result.sessionId,
        actions: result.actions,
      });
    }

    // Streaming response (default)
    const { stream, sessionId: newSessionId } = await agent.processMessageStream(message, sessionId);

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };
    
    if (newSessionId) {
      headers['x-session-id'] = newSessionId;
    }

    return new NextResponse(iteratorToStream(stream), { headers });

  } catch (error: any) {
    console.error("[Chat API] Error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Internal Server Error";
    let statusCode = 500;

    if (error.message?.includes('User not found')) {
      errorMessage = "User not found. Please sign in again.";
      statusCode = 401;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = "Service is busy. Please try again in a moment.";
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: statusCode }
    );
  }
}
