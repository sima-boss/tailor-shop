import Link from "next/link";
import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "New Order — Tailor Shop",
};

export default function NewOrderPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              href="/orders"
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span aria-hidden="true" className="mr-1">&larr;</span> Orders
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1">
              New Order
            </h1>
          </div>
        </div>
      </header>

      {/* form */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-7">
          <OrderForm />
        </div>
      </main>
    </div>
  );
}
