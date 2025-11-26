import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Validate OpenAI API key format and authenticity
 * This endpoint only validates, does NOT save the key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { 
          valid: false,
          error: "API key is required" 
        },
        { status: 400 },
      );
    }

    const trimmedKey = apiKey.trim();

    // Validate format: OpenAI API keys start with "sk-"
    if (!trimmedKey.startsWith("sk-")) {
      return NextResponse.json(
        { 
          valid: false,
          error: "Invalid API key format. OpenAI API keys must start with 'sk-'",
          details: "Please check that you're using a valid OpenAI API key."
        },
        { status: 400 },
      );
    }

    // Basic length check - OpenAI keys can vary in length
    // We'll rely on actual API validation instead of strict length checks
    if (trimmedKey.length < 10) {
      return NextResponse.json(
        { 
          valid: false,
          error: "API key is too short",
          details: "Please check that you've entered the complete API key."
        },
        { status: 400 },
      );
    }
    
    // Warn if key seems unusually long, but don't block it
    if (trimmedKey.length > 200) {
      console.warn("API key seems unusually long, but proceeding with validation");
    }

    // Validate by making a test API call to OpenAI
    try {
      const openai = new OpenAI({ apiKey: trimmedKey });
      
      // Make a lightweight API call to validate the key
      // Using models.list() is a simple way to verify the key works
      const response = await openai.models.list();
      
      // Check if we got a valid response
      if (response && Array.isArray(response.data)) {
        return NextResponse.json({
          valid: true,
          message: "API key validated successfully!",
          details: `Found ${response.data.length} available models.`
        });
      } else {
        return NextResponse.json(
          { 
            valid: false,
            error: "Invalid API key response",
            details: "The API key did not return a valid response from OpenAI."
          },
          { status: 400 },
        );
      }
    } catch (openaiError: any) {
      // Handle specific OpenAI API errors
      if (openaiError?.status === 401) {
        return NextResponse.json(
          { 
            valid: false,
            error: "Invalid API key",
            details: "The API key is not valid or has been revoked. Please check your OpenAI account."
          },
          { status: 401 },
        );
      } else if (openaiError?.status === 429) {
        return NextResponse.json(
          { 
            valid: false,
            error: "Rate limit exceeded",
            details: "Too many requests. Please try again in a moment."
          },
          { status: 429 },
        );
      } else if (openaiError?.status === 500 || openaiError?.status === 503) {
        return NextResponse.json(
          { 
            valid: false,
            error: "OpenAI service unavailable",
            details: "OpenAI's servers are temporarily unavailable. Please try again later."
          },
          { status: 503 },
        );
      } else {
        return NextResponse.json(
          { 
            valid: false,
            error: "API key validation failed",
            details: openaiError?.message || "Unable to validate API key. Please check your key and try again."
          },
          { status: 400 },
        );
      }
    }
  } catch (error) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

