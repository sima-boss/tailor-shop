"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Sign in with email + password.
 *
 * Returns { error: string } on failure.
 * On success, redirects to /dashboard (never returns to caller).
 */
export async function loginAction(
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string ?? "").trim();
  const password = (formData.get("password") as string ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // ---- Env-var check ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[Login] Missing Supabase env vars — NEXT_PUBLIC_SUPABASE_URL:",
      supabaseUrl ? "set" : "MISSING",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseKey ? "set" : "MISSING"
    );
    return { error: "Server configuration error. Please contact the administrator." };
  }

  // ---- Create Supabase client ----
  let supabase;
  try {
    supabase = createClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Login] Failed to create Supabase client:", msg);
    return { error: "Server configuration error. Please try again later." };
  }

  // ---- Attempt sign-in ----
  try {
    console.log(`[Login] Attempting sign-in for: ${email}`);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error(
        `[Login] Supabase auth error for ${email}:`,
        `status=${error.status}`,
        `message="${error.message}"`
      );

      // Map common Supabase errors to user-friendly messages
      const msg = error.message.toLowerCase();

      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        return { error: "Incorrect email or password." };
      }
      if (msg.includes("email not confirmed")) {
        return { error: "Please confirm your email address before signing in." };
      }
      if (
        msg.includes("fetch failed") ||
        msg.includes("network") ||
        msg.includes("econnrefused") ||
        msg.includes("enotfound") ||
        msg.includes("unable to connect")
      ) {
        return {
          error:
            "Cannot connect to the authentication service. " +
            "Your Supabase project may be paused — check the Supabase dashboard.",
        };
      }

      // Return the original message for any other error
      return { error: error.message };
    }
  } catch (err) {
    // signInWithPassword itself threw (raw network-level failure)
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Login] signInWithPassword threw for ${email}:`, message);

    const lower = message.toLowerCase();
    if (
      lower.includes("fetch failed") ||
      lower.includes("network") ||
      lower.includes("econnrefused")
    ) {
      return {
        error:
          "Cannot connect to the authentication service. " +
          "Your Supabase project may be paused — check the Supabase dashboard.",
      };
    }
    return { error: "An unexpected error occurred. Please try again." };
  }

  console.log(`[Login] Success for ${email} — redirecting to /dashboard`);

  // Session is now set in cookies — redirect to the app
  redirect("/dashboard");
}

/**
 * Sign out the current user and redirect to /login.
 * Called as a form action from the dashboard header.
 */
export async function logoutAction(): Promise<never> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
