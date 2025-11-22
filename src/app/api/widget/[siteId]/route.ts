import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } },
) {
  try {
    const { siteId } = params;

    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { widgetSettings: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json({
      siteId,
      widgetSettings: site.widgetSettings ?? {},
    });
  } catch (error) {
    console.error("Widget config error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

