import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import OpenAI from "openai";

/**
 * POST /api/bots/[botId]/api-key
 * Save encrypted API key for a bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = params;
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 },
      );
    }

    // Verify bot ownership using raw query
    let bot: any = null;
    try {
      const bots: any[] = await db.$queryRaw`
        SELECT b.id, s."userId"
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
        LIMIT 1
      `;
      
      if (bots.length > 0) {
        bot = bots[0];
      }
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 },
      );
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Validate API key by making a test call
    try {
      const openai = new OpenAI({ apiKey });
      await openai.models.list(); // Simple API call to validate key
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your key and try again." },
        { status: 400 },
      );
    }

    // Encrypt API key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json(
        { error: "Encryption key not configured" },
        { status: 500 },
      );
    }

    const encryptedKey = encryptApiKey(apiKey, encryptionKey);

    // Update bot with encrypted API key using raw query
    try {
      await db.$executeRaw`
        UPDATE bots
        SET "openaiApiKeyEncrypted" = ${encryptedKey}, "updatedAt" = NOW()
        WHERE id = ${botId}
      `;
    } catch (updateError) {
      console.error("Failed to update bot API key:", updateError);
      return NextResponse.json(
        { error: "Failed to save API key" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key saved successfully",
    });
  } catch (error) {
    console.error("API key save error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}