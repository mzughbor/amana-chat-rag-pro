import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "❌ DATABASE_URL is not set in environment variables.\n" +
    "Please add DATABASE_URL to your .env file.\n" +
    "Get it from Supabase Dashboard → Settings → Database → Connection string"
  );
} else {
  // Validate DATABASE_URL format
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    console.warn(
      "⚠️  DATABASE_URL doesn't look like a valid PostgreSQL connection string.\n" +
      "Expected format: postgresql://user:password@host:port/database"
    );
  }
  
  // Check if using pooler and suggest direct connection if needed
  // "If you encounter connection issues, try Direct Connection (port 5432) instead."
  if (databaseUrl.includes("pooler.supabase.com") && databaseUrl.includes(":6543")) {
    console.log(
      "ℹ️  Using Supabase Connection Pooler (port 6543).\n"
    );
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

// Lazy connection - only connect when needed, not on import
// This prevents connection errors during build/startup
let connectionAttempted = false;

// Helper function to ensure connection
export async function ensureDbConnection() {
  if (connectionAttempted) return;
  
  try {
    connectionAttempted = true;
    await db.$connect();
    console.log("✅ Database connection established");
  } catch (error: any) {
    connectionAttempted = false; // Allow retry
    
    if (error.code === "P1001") {
      console.error(
        "\n❌ Cannot reach database server.\n" +
        "\n🔍 Troubleshooting steps:\n" +
        "1. Check DATABASE_URL in .env file:\n" +
        "   - Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\n" +
        "   - Or pooler: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true\n" +
        "2. Verify Supabase project is active at: https://app.supabase.com\n" +
        "3. Check database password in Supabase Dashboard → Settings → Database\n" +
        "4. If password has special characters (@, #, %, &, ?), URL encode them or change password\n" +
        "5. Try Direct Connection (port 5432) instead of Pooler (port 6543)\n" +
        "\n📝 Error details:", error.message
      );
    } else if (error.code === "P1000") {
      console.error(
        "\n❌ Authentication failed against database server.\n" +
        "\n🔍 This usually means:\n" +
        "1. Database password is incorrect\n" +
        "2. Password contains special characters that need URL encoding\n" +
        "3. Project reference ID is wrong\n" +
        "\n💡 Solution:\n" +
        "- Go to Supabase Dashboard → Settings → Database\n" +
        "- Reset database password if needed\n" +
        "- Copy the connection string again\n" +
        "- Make sure there are NO QUOTES around DATABASE_URL value\n" +
        "\n📝 Error details:", error.message
      );
    } else {
      console.error("❌ Database connection error:", error.message || error);
    }
    throw error;
  }
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;