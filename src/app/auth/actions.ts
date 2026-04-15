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

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Map common Supabase errors to user-friendly messages
    if (
      error.message.toLowerCase().includes("invalid login") ||
      error.message.toLowerCase().includes("invalid credentials")
    ) {
      return { error: "Incorrect email or password." };
    }
    return { error: error.message };
  }

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
