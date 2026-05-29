import Link from "next/link";
import { Building2, ArrowRight, TrendingUp, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingFeatures } from "@/components/marketing/features";

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col overflow-hidden">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-gray-900">
            <Building2 className="w-6 h-6 text-violet-600" />
            <span>PropTrack</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl px-6">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container max-w-6xl mx-auto px-4 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Copy */}
            <div>
              {/* Badge pill */}
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                </span>
                <span className="text-xs font-semibold text-violet-700">NEW</span>
                <span className="text-xs text-violet-700/80">Year-over-year expense reports</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6 text-gray-900">
                Receipts to{" "}
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  tax-ready
                </span>{" "}
                reports
              </h1>

              {/* Subheading */}
              <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-lg font-normal">
                Upload receipts, track expenses by property, and generate CPA-ready financial
                bundles in minutes. No more shoeboxes, no more April stress.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-semibold text-base h-12 rounded-xl px-8"
                  >
                    Start Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-base h-12 rounded-xl px-8"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — Fake Dashboard Mockup Card */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                {/* Card Header */}
                <div className="bg-[#F5F3FF] px-6 py-4 border-b border-violet-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-semibold text-gray-800">Portfolio Overview</span>
                  </div>
                  <span className="text-xs text-violet-600 font-medium bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                    2026
                  </span>
                </div>
                {/* Stats Row */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 px-6 py-5">
                  <div className="pr-4">
                    <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
                    <p className="text-xl font-bold text-gray-900">$24,830</p>
                    <p className="text-xs text-emerald-500 font-medium mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +8.2%
                    </p>
                  </div>
                  <div className="px-4">
                    <p className="text-xs text-gray-400 mb-1">Properties</p>
                    <p className="text-xl font-bold text-gray-900">4</p>
                    <p className="text-xs text-gray-400 mt-0.5">Active</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-xs text-gray-400 mb-1">Receipts</p>
                    <p className="text-xl font-bold text-gray-900">143</p>
                    <p className="text-xs text-gray-400 mt-0.5">Uploaded</p>
                  </div>
                </div>
                {/* Expense Rows */}
                <div className="px-6 pb-4 space-y-2">
                  {[
                    { label: "123 Maple Street", amount: "$8,420", pct: "w-3/4" },
                    { label: "456 Oak Avenue", amount: "$6,210", pct: "w-1/2" },
                    { label: "789 Pine Road", amount: "$5,900", pct: "w-2/5" },
                  ].map((prop) => (
                    <div key={prop.label} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium">{prop.label}</span>
                          <span className="text-gray-900 font-semibold">{prop.amount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-violet-500 rounded-full ${prop.pct}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Card Footer */}
                <div className="px-6 py-3 bg-[#F5F3FF] border-t border-violet-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    CPA Export Ready
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Shield className="w-3.5 h-3.5" />
                    Secure &amp; Encrypted
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Stats Strip */}
        <section className="bg-[#F5F3FF] border-y border-violet-100">
          <div className="container max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center border-b md:border-b-0 md:border-r border-violet-200 pb-8 md:pb-0">
                <p className="text-3xl font-bold text-violet-600 mb-2">500MB</p>
                <p className="text-sm text-gray-500 font-medium">Free Forever Storage</p>
              </div>
              <div className="text-center border-b md:border-b-0 md:border-r border-violet-200 pb-8 md:pb-0">
                <p className="text-3xl font-bold text-violet-600 mb-2">100%</p>
                <p className="text-sm text-gray-500 font-medium">CPA-Ready Exports</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-violet-600 mb-2">No Card</p>
                <p className="text-sm text-gray-500 font-medium">Credit Card Required</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features 2x2 Grid */}
        <MarketingFeatures />

        {/* How It Works — 3 Steps Horizontal */}
        <section className="py-24 bg-white">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-5xl font-bold tracking-tight mb-20 text-gray-900">
              How it works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center mb-6 text-sm">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Upload Receipts</h3>
                <p className="text-gray-500 leading-relaxed font-normal">
                  Snap photos or drag files. We organize them instantly, no busywork required.
                </p>
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center mb-6 text-sm">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Track by Property</h3>
                <p className="text-gray-500 leading-relaxed font-normal">
                  Assign each expense to the right property. See totals and trends anytime.
                </p>
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center mb-6 text-sm">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Export for CPA</h3>
                <p className="text-gray-500 leading-relaxed font-normal">
                  One click. Your accountant gets everything they need, structured and ready.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Full-Width Gradient CTA Band */}
        <section className="py-32 bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-5xl sm:text-6xl font-bold leading-tight mb-8 tracking-tight text-white">
              Stop dreading tax season.
            </h2>
            <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
              PropTrack makes it simple to organize and export everything your CPA needs.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="text-base font-semibold px-10 h-12 bg-white text-violet-600 hover:bg-violet-50 rounded-xl"
              >
                Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
              <Building2 className="w-4 h-4 text-violet-600" />
              <span>PropTrack</span>
              <span className="ml-2">© 2026</span>
            </div>
            <div className="flex gap-6">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
