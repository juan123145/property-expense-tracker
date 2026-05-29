"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await signIn("google", { redirectTo: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Building2 className="w-7 h-7 text-violet-600" />
            <span className="font-bold text-lg tracking-tight text-gray-900">
              PropTrack
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-500 text-sm">
              Access your property expenses and tax reports.
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            className="w-full h-12 text-base font-semibold flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm mb-4 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.3 3.618A11.93 11.93 0 0 0 12 1C6.427 1 1.716 4.74 0 9.765l5.266 0z"
              />
              <path
                fill="currentColor"
                d="M16.04 15.345c-1.077.732-2.505 1.164-4.04 1.164a7.077 7.077 0 0 1-6.734-4.855L0 14.235A11.934 11.934 0 0 0 12 23c3.236 0 6.186-1.054 8.495-2.873l-4.455-4.782z"
              />
              <path
                fill="currentColor"
                d="M23.491 12.273c0-.818-.073-1.609-.209-2.373H12v4.5h6.49c-.281 1.473-1.114 2.718-2.364 3.555l4.455 4.781c2.609-2.409 4.109-5.955 4.109-10.182z"
              />
              <path
                fill="currentColor"
                d="M5.266 11.536A7.01 7.01 0 0 1 5 12c0 .16.01.317.027.473L0 15.09A11.921 11.921 0 0 1 0 8.91l5.266 2.626z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">or</span>
            </div>
          </div>

          {/* Trust Items */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-gray-600">Free 500MB storage</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-gray-600">CPA-ready exports</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-gray-600">No credit card needed</span>
            </div>
          </div>

          {/* Fine Print */}
          <p className="text-xs text-gray-400 text-center">
            By continuing you agree to our{" "}
            <Link
              href="/login"
              className="text-gray-500 hover:text-gray-700 transition-colors font-semibold"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/login"
              className="text-gray-500 hover:text-gray-700 transition-colors font-semibold"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Right Panel — Violet Gradient with dot grid, headline, checks, glassmorphism testimonial */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-violet-700 to-purple-800 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Top badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-300" />
            </span>
            <span className="text-xs font-semibold">Live tracking</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-snug">
            The simplest way to keep your rental finances organized.
          </h2>
          <div className="space-y-4 text-sm text-white/80">
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Receipts organized by property automatically</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>One-click CPA export bundles</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Year-over-year expense trends</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Shared access for your accountant</span>
            </div>
          </div>

          {/* Glassmorphism testimonial */}
          <div className="mt-8 p-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
            <blockquote className="text-sm text-white/90 italic leading-relaxed mb-3">
              &ldquo;Finally, tax season doesn&apos;t feel like a nightmare. PropTrack saved me hours of work.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-400/50 flex items-center justify-center text-xs font-bold">
                JM
              </div>
              <div>
                <p className="text-xs font-semibold text-white">James M.</p>
                <p className="text-xs text-white/60">Landlord, 6 properties</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
          <div>
            <p className="text-2xl font-bold">500MB</p>
            <p className="text-xs text-white/60 mt-0.5">Free Storage</p>
          </div>
          <div>
            <p className="text-2xl font-bold">100%</p>
            <p className="text-xs text-white/60 mt-0.5">CPA-Ready</p>
          </div>
          <div>
            <p className="text-2xl font-bold">Free</p>
            <p className="text-xs text-white/60 mt-0.5">No Card Needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
