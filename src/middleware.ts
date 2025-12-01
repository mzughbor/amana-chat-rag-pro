import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Custom logic to exclude widget chat and dashboard from auth protection
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    
    // Log for debugging in production
    if (process.env.NODE_ENV === "production") {
      console.log(`[Middleware] Path: ${pathname}, Has token: ${!!token}`);
    }
    
    // Allow these routes without authentication (for guest bot creation)
    if (pathname.startsWith('/widget/chat/') || pathname === '/dashboard') {
      return NextResponse.next();
    }
    
    // If user is authenticated, allow access to all protected routes
    // This ensures /upload and /widget are accessible when authenticated
    if (token) {
      if (process.env.NODE_ENV === "production") {
        console.log(`[Middleware] Allowing access to ${pathname} for authenticated user`);
      }
      return NextResponse.next();
    }
    
    // For unauthenticated users, NextAuth will redirect to signIn page
    // Don't force redirect to dashboard - let NextAuth handle redirect to /login
    // The signIn page will preserve the original URL as callbackUrl
    return undefined; // This will trigger the authorized callback
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Log for debugging
        if (process.env.NODE_ENV === "production") {
          console.log(`[Middleware Auth] Path: ${pathname}, Authorized: ${!!token}`);
        }
        
        // Allow dashboard access without auth (for guest bot creation)
        if (pathname === '/dashboard') {
          return true;
        }
        
        // Allow access if token exists
        // This is critical: if token exists, allow access to /upload and /widget
        return !!token;
      },
    },
    pages: {
      signIn: "/login", // Redirect to login, not dashboard
    },
  },
);

export const config = {
  matcher: [
    // Don't protect dashboard - allow guest access
    // "/dashboard/:path*", 
    "/upload/:path*", 
    "/api-key/:path*", 
    "/logs/:path*",
    // Protect widget setup but not widget chat
    "/widget/:path*",
  ],
};