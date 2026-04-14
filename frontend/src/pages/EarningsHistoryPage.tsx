import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { bookingsApi } from "../api/axios";
import type { Booking } from "../components/BookingCard";
import { Wallet, Calendar, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

const EARNINGS_STATUSES = new Set([
  "accepted",
  "completion_requested",
  "awaiting_confirmation",
  "completed",
]);

function parseAmount(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

function formatRs(amount: number): string {
  return `Rs ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatBookingDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function isInCurrentMonth(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  } catch {
    return false;
  }
}

function serviceTypesLabel(types: string[] | undefined): string {
  if (!types?.length) return "—";
  return types.join(", ");
}

const EarningsHistoryPage = () => {
  const PAGE_SIZE = 5;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await bookingsApi.get("list/");
        const data = Array.isArray(res?.data) ? res.data : [];
        setBookings(data);
      } catch {
        setError("Failed to load earnings data");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const earningsRows = useMemo(() => {
    return bookings
      .filter((b) => EARNINGS_STATUSES.has(b.status))
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [bookings]);

  const summaries = useMemo(() => {
    const paidRows = earningsRows.filter((b) => b.payment_status === "paid");
    const paidTotal = paidRows.reduce(
      (sum, b) => sum + parseAmount(b.total_amount),
      0,
    );
    const thisMonthPaid = paidRows
      .filter((b) => isInCurrentMonth(b.date))
      .reduce((sum, b) => sum + parseAmount(b.total_amount), 0);

    return {
      totalEarnings: paidTotal,
      thisMonth: thisMonthPaid,
    };
  }, [earningsRows]);

  const totalPages = Math.max(1, Math.ceil(earningsRows.length / PAGE_SIZE));

  const indexOfLast = currentPage * PAGE_SIZE;
  const indexOfFirst = indexOfLast - PAGE_SIZE;
  const paginatedRows = earningsRows.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    setCurrentPage(1);
  }, [earningsRows.length]);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">
          <div className="hidden lg:block" aria-hidden="true" />

          <header className="mb-1 lg:mb-0">
            <h1 className="text-2xl font-semibold text-gray-800">
              Earnings History
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Track payments by booking for your accepted and completed care
              sessions.
            </p>
          </header>

          {/* Left: summary cards */}
          <aside className="h-fit lg:row-start-2">
            <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                    <Wallet className="w-6 h-6 shrink-0" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                      {formatRs(summaries.totalEarnings)}
                    </p>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                  </div>
                </div>

                <div className="border-t border-green-300 my-4" />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                    <Calendar className="w-6 h-6 shrink-0" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                      {formatRs(summaries.thisMonth)}
                    </p>
                    <p className="text-sm text-gray-600">This Month Earnings</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: table */}
          <div className="flex-1 min-w-0 lg:row-start-2">
            {loading ? (
              <div className="flex items-center justify-center py-16 bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-600" />
              </div>
            ) : earningsRows.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-600 text-sm">
                No accepted or completed bookings yet. Earnings will appear here
                once you have active sessions.
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-green-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Care seeker name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Service type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                            Payment status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRows.map((b) => {
                          const paid = b.payment_status === "paid";
                          return (
                            <tr
                              key={b.id}
                              className="hover:bg-green-100/80 transition-colors"
                            >
                              <td className="px-4 py-3 text-gray-800 whitespace-nowrap align-top">
                                {formatBookingDate(b.date)}
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium align-top">
                                {b.family_name || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-600 align-top">
                                {serviceTypesLabel(b.service_types)}
                              </td>
                              <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap align-top">
                                {formatRs(parseAmount(b.total_amount))}
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <span
                                  className={
                                    paid
                                      ? "inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                                      : "inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800"
                                  }
                                >
                                  {paid ? "Paid" : "Unpaid"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  <span className="text-sm text-gray-600 px-2">
                    Page {currentPage} of {totalPages || 1}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsHistoryPage;
