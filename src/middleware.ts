import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Custom logic to exclude widget chat from auth protection
    const { pathname } = req.nextUrl;
    
    // If this is a widget chat route, allow it without auth
    if (pathname.startsWith('/widget/chat/')) {
      return NextResponse.next();
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/upload/:path*", 
    "/api-key/:path*", 
    "/logs/:path*",
    // Protect widget setup but not widget chat
    "/widget/:path*",
  ],
};