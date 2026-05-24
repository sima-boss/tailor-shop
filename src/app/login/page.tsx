import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign In — Danaty Fashion" };

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* Decorative soft glow — purely visual, no layout impact */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-indigo-100/40 blur-3xl"
      />

      <div className="relative w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white text-lg font-semibold mb-4 shadow-sm">
            DF
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Danaty Fashion
          </h1>
          <p className="mt-1 text-sm text-slate-500" dir="rtl">
            داناتي فاشن
          </p>
          <p className="mt-3 text-sm text-slate-500">Sign in to continue</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-7 sm:p-8">
          <LoginForm />
        </div>

        {/* Subtle footer hint */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Aswaq Al Warqa 2 &middot; Shop No. 39 &amp; 40
        </p>
      </div>
    </div>
  );
}
