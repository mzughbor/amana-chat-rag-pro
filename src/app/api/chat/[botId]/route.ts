import { NextRequest, NextResponse } from "next/server";

// MVP: Simple placeholder API route
// Later this will connect to RAG pipeline
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const { botId } = params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // MVP: Return placeholder response
    // TODO: Connect to RAG pipeline
    return NextResponse.json({
      response: "Hello, I'm your bot!",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

