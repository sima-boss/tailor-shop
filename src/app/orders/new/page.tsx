import Link from "next/link";
import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "New Order — Tailor Shop",
};

export default function NewOrderPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">New Order</h1>
          </div>
        </div>
      </header>

      {/* form */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <OrderForm />
        </div>
      </main>
    </div>
  );
}
