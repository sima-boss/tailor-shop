"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/auth/actions";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await loginAction(formData);
        if (result?.error) setError(result.error);
      } catch {
        setError(
          "Unable to reach the server. Please check your internet connection and try again."
        );
      }
    });
  }

  // Shared input styles for cleaner JSX
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
    "placeholder-slate-400 shadow-sm transition " +
    "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 " +
    "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white
                   shadow-sm transition-all
                   hover:bg-slate-800 hover:shadow
                   focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2
                   active:scale-[0.99]
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
