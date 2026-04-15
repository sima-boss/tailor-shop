import { Resend } from "resend";
import { formatMoney } from "@/lib/currency";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InvoiceEmailData {
  to: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  orderType: "alteration" | "tailoring";
  totalAmount: number;
  dueDate: string | null;
  currency: string;
  store: {
    name: string;
    nameAr: string;
    phone: string;
    mobile: string;
    email: string;
    location: string;
    locationAr: string;
    shopNumber: string;
    shopNumberAr: string;
    footer: string;
    liabilityNotice: string;
    liabilityNoticeAr: string;
  };
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const invoiceUrl = `${baseUrl}/orders/${data.orderId}/invoice`;
  const serviceType = data.orderType === "alteration" ? "Alteration" : "Custom Tailoring";
  const fromAddress = process.env.EMAIL_FROM ?? `${data.store.name} <onboarding@resend.dev>`;

  const storeName        = escapeHtml(data.store.name);
  const storeNameAr      = escapeHtml(data.store.nameAr);
  const storePhone       = escapeHtml(data.store.phone);
  const storeMobile      = escapeHtml(data.store.mobile);
  const storeEmail       = escapeHtml(data.store.email);
  const storeLocation    = escapeHtml(data.store.location);
  const storeLocationAr  = escapeHtml(data.store.locationAr);
  const shopNumber       = escapeHtml(data.store.shopNumber);
  const shopNumberAr     = escapeHtml(data.store.shopNumberAr);
  const storeFooter      = escapeHtml(data.store.footer);
  const liabilityNotice  = escapeHtml(data.store.liabilityNotice);
  const liabilityNoticeAr = escapeHtml(data.store.liabilityNoticeAr);
  const customerName     = escapeHtml(data.customerName);

  // Build the header info lines
  const nameArSuffix = storeNameAr ? ` &middot; ${storeNameAr}` : "";
  const locationLine = (storeLocation || storeLocationAr)
    ? `<p style="margin:2px 0 0; color:#9ca3af; font-size:12px;">${storeLocation}${storeLocation && storeLocationAr ? " &middot; " : ""}${storeLocationAr}</p>`
    : "";
  const shopLine = (shopNumber || shopNumberAr)
    ? `<p style="margin:2px 0 0; color:#9ca3af; font-size:12px;">${shopNumber}${shopNumber && shopNumberAr ? " &middot; " : ""}${shopNumberAr}</p>`
    : "";
  const phoneLine = storePhone
    ? `<p style="margin:2px 0 0; color:#9ca3af; font-size:12px;">Tel: ${storePhone}</p>`
    : "";
  const mobileLine = storeMobile
    ? `<p style="margin:2px 0 0; color:#9ca3af; font-size:12px;">Suggestions &amp; Complaints: ${storeMobile}</p>`
    : "";
  const emailLine = storeEmail
    ? `<p style="margin:2px 0 0; color:#9ca3af; font-size:12px;">${storeEmail}</p>`
    : "";

  // Build the footer liability block
  const liabilityBlock = (liabilityNoticeAr || liabilityNotice)
    ? `${liabilityNoticeAr ? `<p style="margin:0 0 4px; color:#374151; font-size:12px; font-weight:500; direction:rtl;">${liabilityNoticeAr}</p>` : ""}
       ${liabilityNotice ? `<p style="margin:0 0 8px; color:#374151; font-size:12px;">${liabilityNotice}</p>` : ""}
       <hr style="border:none; border-top:1px solid #e5e7eb; margin:8px 0;" />`
    : "";

  await resend.emails.send({
    from: fromAddress,
    to: data.to,
    subject: `Order Confirmation — #${data.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111827; padding:24px 32px;">
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">Order Confirmation</h1>
              <p style="margin:4px 0 0; color:#ffffff; font-size:14px; font-weight:600;">${storeName}${nameArSuffix}</p>
              ${locationLine}
              ${shopLine}
              ${phoneLine}
              ${mobileLine}
              ${emailLine}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px; color:#374151; font-size:15px; line-height:1.5;">
                Hi <strong>${customerName}</strong>,
              </p>
              <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.5;">
                Your order has been received and is being processed. Here are the details:
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; margin-bottom:24px;">
                <tr style="background-color:#f9fafb;">
                  <td style="padding:10px 16px; font-size:13px; color:#6b7280; font-weight:600; border-bottom:1px solid #e5e7eb;">Order Number</td>
                  <td style="padding:10px 16px; font-size:13px; color:#111827; font-weight:600; text-align:right; border-bottom:1px solid #e5e7eb; font-family:monospace;">#${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Service Type</td>
                  <td style="padding:10px 16px; font-size:13px; color:#111827; text-align:right; border-bottom:1px solid #e5e7eb;">${serviceType}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Total Amount</td>
                  <td style="padding:10px 16px; font-size:15px; color:#111827; font-weight:700; text-align:right; border-bottom:1px solid #e5e7eb;">${formatMoney(data.totalAmount, data.currency)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px; font-size:13px; color:#6b7280;">Due Date</td>
                  <td style="padding:10px 16px; font-size:13px; color:#111827; text-align:right;">${formatDate(data.dueDate)}</td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}"
                       style="display:inline-block; background-color:#2563eb; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:6px;">
                      View Invoice
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; border-top:1px solid #e5e7eb; padding:16px 32px; text-align:center;">
              ${liabilityBlock}
              <p style="margin:0; color:#9ca3af; font-size:12px;">${storeFooter}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
