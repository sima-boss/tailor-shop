/**
 * Role-Based Access Control (RBAC)
 *
 * Two roles:
 *  - "owner"  Full access (revenue, commissions, all stats)
 *  - "staff"  Limited access (orders, delivery alerts, payment status only)
 *
 * Role source (in priority order):
 *  1. Authenticated user's Supabase user_metadata.role  ← primary (production)
 *  2. Authenticated user's Supabase app_metadata.role   ← alternative
 *  3. MOCK_USER_ROLE env var                            ← dev override only
 *  4. Default "owner" if no role claim is set
 *
 * How to assign a role in Supabase:
 *   Supabase Dashboard → Authentication → Users → click a user → Edit
 *   Set user_metadata:  { "role": "owner" }  or  { "role": "staff" }
 *
 * Extending the system:
 *  1. Add new roles to UserRole below.
 *  2. Add new permissions to PERMISSIONS.
 *  3. Call canAccess(role, "new_permission") wherever needed.
 *  4. Add Supabase RLS policies to enforce permissions at the DB layer too.
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================
// Role type
// ============================================================

export type UserRole = "owner" | "staff";

// ============================================================
// Permission map
// Each entry lists which roles may access that feature.
// ============================================================

export const PERMISSIONS = {
  view_revenue:         ["owner"],
  view_total_orders:    ["owner"],
  view_fully_paid:      ["owner"],
  view_tailor_earnings: ["owner"],
  view_delivery_alerts: ["owner", "staff"],
  manage_orders:        ["owner", "staff"],
} satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Returns true when the given role is allowed to access the permission. */
export function canAccess(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// ============================================================
// Role resolution
// ============================================================

/**
 * Resolves the current user's role from their Supabase session.
 *
 * Priority:
 *  1. Supabase user_metadata.role  ← real auth, always checked first
 *  2. Supabase app_metadata.role
 *  3. MOCK_USER_ROLE env var       ← dev convenience, ignored in production
 *  4. Default "owner"              ← keeps existing accounts working
 *
 * This function is server-only (uses next/headers via createClient).
 * Route protection is handled by middleware — unauthenticated users
 * never reach this function in normal app flow.
 */
export async function getUserRole(): Promise<UserRole> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const roleClaim =
        (user.user_metadata?.role as string | undefined) ??
        (user.app_metadata?.role as string | undefined);

      if (roleClaim === "staff") return "staff";
      if (roleClaim === "owner") return "owner";
      // Role claim not set — fall through to defaults below
    }
  } catch {
    // Fall through to defaults on unexpected errors
  }

  // Dev-only override (only reached when no authenticated role claim exists)
  const mock = process.env.MOCK_USER_ROLE;
  if (mock === "staff") return "staff";
  if (mock === "owner") return "owner";

  // Default: full access (safe for existing accounts without a role claim)
  return "owner";
}
