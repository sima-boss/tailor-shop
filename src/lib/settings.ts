import { createClient } from "@/lib/supabase/server";

export interface StoreSettings {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  currency: string;
  tax_rate: string;
  default_due_days: string;
  receipt_footer_text: string;
}

const DEFAULTS: StoreSettings = {
  store_name: "Tailor Shop",
  store_phone: "",
  store_email: "",
  store_address: "",
  currency: "AED",
  tax_rate: "0",
  default_due_days: "7",
  receipt_footer_text: "Thank you for your business!",
};

/**
 * Fetch all store settings from the `store_settings` key-value table.
 * Returns a typed object with fallback defaults for any missing keys.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = createClient();

  const { data: rows, error } = await supabase
    .from("store_settings")
    .select("key, value");

  if (error) {
    console.error("[StoreSettings] query failed:", error.message);
    return { ...DEFAULTS };
  }

  if (!rows || rows.length === 0) {
    console.warn("[StoreSettings] no rows returned — using defaults");
    return { ...DEFAULTS };
  }

  console.log(`[StoreSettings] loaded ${rows.length} settings from database`);

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    store_name: map.store_name || DEFAULTS.store_name,
    store_phone: map.store_phone || DEFAULTS.store_phone,
    store_email: map.store_email || DEFAULTS.store_email,
    store_address: map.store_address || DEFAULTS.store_address,
    currency: map.currency || DEFAULTS.currency,
    tax_rate: map.tax_rate || DEFAULTS.tax_rate,
    default_due_days: map.default_due_days || DEFAULTS.default_due_days,
    receipt_footer_text: map.receipt_footer_text || DEFAULTS.receipt_footer_text,
  };
}
