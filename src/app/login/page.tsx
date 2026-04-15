import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign In — Tailor Shop" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tailor Shop</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <LoginForm />
        </div>

      </div>
    </div>
  );
}
