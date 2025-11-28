import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
    "/widget/:path*"
  ],
};