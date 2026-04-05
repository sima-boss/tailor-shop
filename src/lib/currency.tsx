/**
 * Shared currency formatting for the entire app.
 *
 * The currency code is read from store_settings at the call site
 * and passed in. This module has no Supabase dependency.
 */

// Currencies where Intl.NumberFormat renders a clean, universally
// recognised symbol ($, €, £). Everything else uses the ISO code.
const SYMBOL_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CNY"]);

/**
 * Format an amount for display.
 *
 * - USD  →  $121.00
 * - AED  →  AED 121.00
 * - EUR  →  €121.00
 *
 * Always 2 decimal places.
 */
export function formatMoney(amount: number, currency: string = "AED"): string {
  if (SYMBOL_CURRENCIES.has(currency)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // For AED and other codes: "AED 1,234.00"
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
}

/**
 * Plain-text format for non-HTML contexts (WhatsApp, logs).
 * Identical output to formatMoney — exists for semantic clarity.
 */
export const formatMoneyText = formatMoney;

/**
 * Inline SVG for the AED currency symbol (د.إ).
 *
 * Renders as a small SVG element so it works regardless of whether
 * the user's system has Arabic fonts installed. Falls back to the
 * text "AED" if the SVG somehow fails to paint.
 *
 * Usage in JSX:  <AedSymbol />  or  <AedSymbol className="h-5 w-5" />
 *
 * NOTE: This is a JSX component — only import it in .tsx files.
 *       For server-rendered HTML strings (e.g. emails), use formatMoney().
 */
export function AedSymbol({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline ${className ?? ""}`}
      aria-label="AED"
      title="UAE Dirham"
    >
      <svg
        viewBox="0 0 46 22"
        className="h-[0.85em] w-auto"
        role="img"
        aria-hidden="true"
      >
        {/* Rounded background pill */}
        <rect x="0" y="0" width="46" height="22" rx="4" fill="currentColor" opacity="0.1" />
        {/* "د.إ" rendered as SVG text — works on any OS with basic Arabic shaping */}
        <text
          x="23"
          y="16"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fontFamily="'Segoe UI', system-ui, Tahoma, Arial, sans-serif"
          fill="currentColor"
          direction="rtl"
        >
          د.إ
        </text>
      </svg>
    </span>
  );
}

/**
 * Render a formatted amount with the correct currency prefix.
 *
 * For AED it renders the inline SVG symbol + number.
 * For everything else it renders the Intl-formatted string.
 *
 * Usage:  <Money amount={150} currency="AED" />
 */
export function Money({
  amount,
  currency = "AED",
  className,
}: {
  amount: number;
  currency?: string;
  className?: string;
}) {
  if (currency === "AED") {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return (
      <span className={className}>
        <AedSymbol /> {formatted}
      </span>
    );
  }

  return <span className={className}>{formatMoney(amount, currency)}</span>;
}
