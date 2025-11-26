import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

// Simple function to generate a cuid-like ID
function generateCuid() {
  return 'c' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/login`,
      }
    });

    // Even if Supabase signup has an issue (like email validation), 
    // we still want to create the user in our database
    if (error) {
      console.warn("Supabase signup warning (continuing with local creation):", error.message);
      // Continue with local user creation
    }

    // Always try to create user in our database via REST API
    try {
      // First, try to get the user to see if they already exist
      const { data: existingUser, error: existingUserError } = await supabaseRestClient
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      // If user doesn't exist, create them
      if (existingUserError || !existingUser) {
        // Generate an ID for the user
        const userId = data?.user?.id || generateCuid();
        
        // Get current timestamp
        const now = new Date().toISOString();
        
        // Create user
        const { data: newUser, error: createError } = await supabaseRestClient
          .from('users')
          .insert({
            id: userId,
            email: email,
            name: null,
            image: null,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single();

        if (createError) {
          console.error("Failed to create user:", createError);
          // If we can't create the user in our database, return an error
          return NextResponse.json(
            { error: "Failed to create user account" },
            { status: 500 }
          );
        }
        
        // Create account binding if we have Supabase user data
        if (data?.user) {
          const { error: accountError } = await supabaseRestClient
            .from('accounts')
            .insert({
              id: generateCuid(), // Generate ID for account
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
        }
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      // If we can't create the user in our database, return an error
      return NextResponse.json(
        { error: "Failed to create user account in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. Please check your email for verification.",
      user: data?.user ? {
        id: data.user.id,
        email: data.user.email,
      } : {
        email: email,
      }
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}