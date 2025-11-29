"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Button from "~/components/common/Button";
import Modal from "~/components/common/Modal";
import { ChatBubbleIcon } from "~/components/icons/ChatBubbleIcon";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      // Sign out from NextAuth - this will clear the session cookie
      await signOut({ 
        callbackUrl: "/",
        redirect: true 
      });
    } catch (error) {
      console.error("Logout error:", error);
      // If signOut fails, force redirect to home page
      router.push("/");
      router.refresh();
    }
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo */}
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-300 text-purple-600">
              <ChatBubbleIcon className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-900">AmanaRAG</span>
            </Link>

            {/* Center: Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isActive("/dashboard")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/upload"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isActive("/upload")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Upload
                  </Link>
                  <Link
                    href="/widget"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isActive("/widget")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Widget
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/#features"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      pathname === "/" && pathname.includes("#features")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Product
                  </Link>
                  <Link
                    href="/#features"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      pathname === "/" && pathname.includes("#features")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Features
                  </Link>
                  <Link
                    href="/#pricing"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      pathname === "/" && pathname.includes("#pricing")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/#docs"
                    className={`text-sm font-medium transition-colors duration-300 ${
                      pathname === "/" && pathname.includes("#docs")
                        ? "text-purple-600"
                        : "text-slate-700 hover:text-purple-600"
                    }`}
                  >
                    Documentation
                  </Link>
                </>
              )}
            </div>

            {/* Right: Conditional Auth Links */}
            <div className="flex items-center gap-3">
              {status === "loading" ? (
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              ) : session ? (
                <>
                  <span className="hidden sm:inline text-sm text-slate-700 font-medium">
                    {session.user?.name || session.user?.email?.split("@")[0] || "User"}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setShowLogoutModal(true)}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to log out?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
