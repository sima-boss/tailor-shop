import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { getUserRole } from "@/lib/rbac";
import DashboardClient, { type DashboardOrder } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Tailor Shop" };

export default async function DashboardPage() {
  const supabase = createClient();

  // Resolve role and settings in parallel
  const [settings, role] = await Promise.all([
    getStoreSettings(),
    getUserRole(),
  ]);

  // --- Tier 1: try with completed_by AND completed_at ---
  const tier1 = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, status, payment_status, total_amount, completed_by, completed_at, due_date, created_at, customers(name)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  type RawRow = Record<string, unknown>;

  let rawOrders: RawRow[] = [];
  let hasCompletedBy = true;
  let hasCompletedAt = true;

  if (!tier1.error) {
    rawOrders = (tier1.data ?? []) as RawRow[];
  } else {
    const missing = (msg: string) =>
      msg.includes("completed_by") ||
      msg.includes("completed_at") ||
      msg.includes("does not exist") ||
      msg.includes("schema cache");

    if (missing(tier1.error.message)) {
      // --- Tier 2: try with completed_by only (no completed_at) ---
      const tier2 = await supabase
        .from("orders")
        .select(
          "id, order_number, order_type, status, payment_status, total_amount, completed_by, due_date, created_at, customers(name)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!tier2.error) {
        rawOrders = (tier2.data ?? []) as RawRow[];
        hasCompletedAt = false;
      } else if (missing(tier2.error.message)) {
        // --- Tier 3: bare minimum query ---
        const tier3 = await supabase
          .from("orders")
          .select(
            "id, order_number, order_type, status, payment_status, total_amount, due_date, created_at, customers(name)"
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        rawOrders = (tier3.data ?? []) as RawRow[];
        hasCompletedBy = false;
        hasCompletedAt = false;
      } else {
        rawOrders = [];
      }
    }
  }

  const orders: DashboardOrder[] = rawOrders.map((o) => {
    const customer = o.customers as { name: string } | null;
    return {
      id: o.id as string,
      order_number: o.order_number as string,
      order_type: o.order_type as string,
      status: o.status as string,
      payment_status: o.payment_status as string,
      total_amount: Number(o.total_amount) || 0,
      completed_by: hasCompletedBy ? ((o.completed_by as string | null) ?? null) : null,
      completed_at: hasCompletedAt ? ((o.completed_at as string | null) ?? null) : null,
      due_date: (o.due_date as string | null) ?? null,
      created_at: o.created_at as string,
      customer_name: customer?.name ?? "—",
    };
  });

  // Server-side data hygiene: staff users never receive financial amounts
  // in the page payload — even if they inspect the network response.
  const clientOrders: DashboardOrder[] =
    role === "owner"
      ? orders
      : orders.map((o) => ({ ...o, total_amount: 0 }));

  return (
    <DashboardClient
      allOrders={clientOrders}
      currency={settings.currency}
      role={role}
    />
  );
}
