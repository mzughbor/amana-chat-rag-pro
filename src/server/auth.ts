import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextRequest } from "next/server";
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
import { cookies } from "next/headers";
import { type Session } from "next-auth";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

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
          throw new Error("Email and password are required");
        }

        try {
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
            throw new Error("No user data returned from authentication");
          }

          // Get or create user in our database using REST API as primary method
          // since we know the direct DB connection is unreliable
          try {
            const { data: userData, error: userError } = await supabaseRestClient
              .from('users')
              .select('*')
              .eq('email', data.user.email)
              .single();

            if (userError && userError.code !== 'PGRST116') { // PGRST116 means no rows returned
              throw userError;
            }

            let user;
            if (userData) {
              user = {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                image: userData.image,
              };
            } else {
              // Create user if not exists - this handles the case where a user
              // signed up but the database sync failed or was delayed
              try {
                // Generate an ID for the user
                const userId = data.user.id || ('c' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
                
                // Get current timestamp
                const now = new Date().toISOString();
                
                const { data: newUser, error: createError } = await supabaseRestClient
                  .from('users')
                  .insert({
                    id: userId,
                    email: data.user.email!,
                    name: data.user.user_metadata?.name ?? null,
                    image: data.user.user_metadata?.avatar_url ?? null,
                    createdAt: now,
                    updatedAt: now,
                  })
                  .select()
                  .single();

                if (createError) throw createError;
                
                user = {
                  id: newUser.id,
                  email: newUser.email,
                  name: newUser.name,
                  image: newUser.image,
                };
                
                // Also create an account entry to bind with Supabase auth
                const { error: accountError } = await supabaseRestClient
                  .from('accounts')
                  .insert({
                    id: 'c' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36), // Generate ID for account
                    userId: newUser.id,
                    type: 'oauth',
                    provider: 'supabase',
                    providerAccountId: data.user.id,
                    createdAt: now,
                    updatedAt: now,
                  });
                  
                if (accountError) {
                  console.warn("Failed to create account binding:", accountError.message);
                }
              } catch (createError: any) {
                console.error("Failed to create user during auth:", createError);
                // If we can't create the user, we should still allow them to sign in
                // This might happen if there's a temporary database issue
                user = {
                  id: data.user.id,
                  email: data.user.email,
                  name: data.user.user_metadata?.name ?? null,
                  image: data.user.user_metadata?.avatar_url ?? null,
                };
              }
            }

            return user;
          } catch (restError: any) {
            console.error("Error with REST API user management:", restError.message);
            // Even if database sync fails, we can still authenticate the user
            // using the data from Supabase Auth
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name ?? null,
              image: data.user.user_metadata?.avatar_url ?? null,
            };
          }
        } catch (error: any) {
          console.error("Authentication error:", error.message);
          throw error;
        }
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
 */
export async function getServerAuthSession(): Promise<Session | null> {
  try {
    // Use REST API approach since we know it works
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

    // Get user from database via REST API
    const { data: userData, error: userError } = await supabaseRestClient
      .from('users')
      .select('*')
      .eq('email', token.email)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
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

    // Get user from database via REST API
    const { data: userData, error: userError } = await supabaseRestClient
      .from('users')
      .select('*')
      .eq('email', token.email)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  } catch (error) {
    console.error("Error getting server session from request:", error);
    return null;
  }
}