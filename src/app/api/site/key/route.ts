import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSessionFromRequest(request);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 },
      );
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

    // Get or create site
    let site = await db.site.findFirst({
      where: { userId: session.user.id },
    });

    if (site) {
      // Update existing site
      site = await db.site.update({
        where: { id: site.id },
        data: { apiKeyEncrypted: encryptedKey },
      });
    } else {
      // Create new site
      site = await db.site.create({
        data: {
          userId: session.user.id,
          name: "My Site",
          apiKeyEncrypted: encryptedKey,
        },
      });
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

