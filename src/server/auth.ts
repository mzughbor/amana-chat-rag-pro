import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextRequest, type NextResponse } from "next/server";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import { type DefaultJWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/lib/db";
import { supabaseAdmin } from "~/lib/supabase";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { type Session } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          return null;
        }

        // Use Supabase Auth to verify credentials
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          console.error("Supabase auth error:", error.message);
          // Check for specific error types
          if (error.message.includes("Email not confirmed")) {
            throw new Error("Please verify your email address before signing in. Check your inbox for the verification link.");
          }
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password");
          }
          throw new Error(error.message || "Authentication failed");
        }

        if (!data.user) {
          console.error("No user data returned from Supabase");
          return null;
        }

        // Get or create user in our database
        // Ensure database connection before querying
        let user;
        try {
          user = await db.user.findUnique({
            where: { email: data.user.email ?? undefined },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: data.user.email!,
                name: data.user.user_metadata?.name ?? null,
                image: data.user.user_metadata?.avatar_url ?? null,
              },
            });
          }
        } catch (dbError: any) {
          // Handle database connection errors
          if (dbError.code === "P1001" || dbError.code === "P1000") {
            console.error("Database connection error during authentication:", dbError.message);
            throw new Error(
              "Database connection failed. Please check your DATABASE_URL in .env file. " +
              "See terminal for detailed error message."
            );
          }
          throw dbError;
        }

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
};

/**
 * Get server session in App Router (for server components)
 * Use this in server components and server actions
 * Workaround for next-auth v4 with App Router
 */
export async function getServerAuthSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    
    // Get session token from cookies
    const sessionToken = cookieStore.get("next-auth.session-token")?.value ||
                         cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      return null;
    }

    // Decode and verify the JWT token
    const token = await getToken({
      req: {
        headers: {},
        cookies: {
          "next-auth.session-token": sessionToken,
        },
      } as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.email) {
      return null;
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: token.email as string },
    });

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

/**
 * Get server session in API routes
 * Use this in API route handlers (route.ts files)
 * Uses getToken which works better with API routes
 */
export async function getServerAuthSessionFromRequest(
  req: NextRequest,
): Promise<Session | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    
    // Get the session token from cookies
    const sessionToken = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("next-auth.session-token=") || c.startsWith("__Secure-next-auth.session-token="))
      ?.split("=")[1];

    if (!sessionToken) {
      return null;
    }

    // Decode and verify the JWT token
    const token = await getToken({
      req: {
        headers: Object.fromEntries(req.headers.entries()),
        cookies: Object.fromEntries(
          cookieHeader.split("; ").map((c) => {
            const [name, ...rest] = c.split("=");
            return [name, rest.join("=")];
          }).filter(([name]) => name)
        ),
      } as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.email) {
      return null;
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: token.email as string },
    });

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  } catch (error) {
    console.error("Error getting server session from request:", error);
    return null;
  }
}

