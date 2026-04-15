import { createClient } from "@/lib/supabase/server";

export interface StoreSettings {
  store_name: string;
  store_name_ar: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_location: string;
  store_location_ar: string;
  store_shop_number: string;
  store_shop_number_ar: string;
  store_mobile: string;
  store_liability_notice: string;
  store_liability_notice_ar: string;
  currency: string;
  tax_rate: string;
  default_due_days: string;
  receipt_footer_text: string;
}

const DEFAULTS: StoreSettings = {
  store_name: "Danaty Fashion",
  store_name_ar: "داناتي فاشن",
  store_phone: "04 2801936",
  store_email: "Buhamidm2024@gmail.com",
  store_address: "",
  store_location: "Aswaq Al Warqa 2",
  store_location_ar: "أسواق الورقاء 2",
  store_shop_number: "Shop No. 39 & 40",
  store_shop_number_ar: "محل رقم 39 و 40",
  store_mobile: "055 696 3779",
  store_liability_notice: "The shop is not responsible for keeping any item above 6 months",
  store_liability_notice_ar: "لا يتحمل المحل مسؤولية الاحتفاظ بأي بضاعة فوق 6 شهور",
  currency: "AED",
  tax_rate: "0",
  default_due_days: "7",
  receipt_footer_text: "Thank you for visiting Danaty Fashion!",
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
    store_name:             map.store_name             || DEFAULTS.store_name,
    store_name_ar:          map.store_name_ar          || DEFAULTS.store_name_ar,
    store_phone:            map.store_phone            || DEFAULTS.store_phone,
    store_email:            map.store_email            || DEFAULTS.store_email,
    store_address:          map.store_address          || DEFAULTS.store_address,
    store_location:         map.store_location         || DEFAULTS.store_location,
    store_location_ar:      map.store_location_ar      || DEFAULTS.store_location_ar,
    store_shop_number:      map.store_shop_number      || DEFAULTS.store_shop_number,
    store_shop_number_ar:   map.store_shop_number_ar   || DEFAULTS.store_shop_number_ar,
    store_mobile:           map.store_mobile           || DEFAULTS.store_mobile,
    store_liability_notice:    map.store_liability_notice    || DEFAULTS.store_liability_notice,
    store_liability_notice_ar: map.store_liability_notice_ar || DEFAULTS.store_liability_notice_ar,
    currency:               map.currency               || DEFAULTS.currency,
    tax_rate:               map.tax_rate               || DEFAULTS.tax_rate,
    default_due_days:       map.default_due_days       || DEFAULTS.default_due_days,
    receipt_footer_text:    map.receipt_footer_text    || DEFAULTS.receipt_footer_text,
  };
}
