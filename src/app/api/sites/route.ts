import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sites for the authenticated user
    const userSites = await db.site.findMany({
      where: {
        user: {
          email: session.user.email,
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(userSites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 });
  }
}