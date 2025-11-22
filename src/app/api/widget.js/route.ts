import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const widgetPath = join(process.cwd(), "public", "widget.js");
    const widgetContent = readFileSync(widgetPath, "utf-8");

    return new NextResponse(widgetContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Widget not found", { status: 404 });
  }
}

