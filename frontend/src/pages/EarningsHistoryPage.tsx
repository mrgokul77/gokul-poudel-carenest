import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { bookingsApi } from "../api/axios";
import type { Booking } from "../components/BookingCard";
import { Wallet, Calendar, AlertCircle } from "lucide-react";

const EARNINGS_STATUSES = new Set([
  "accepted",
  "completion_requested",
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <header className="mb-8 md:ml-64">
          <h1 className="text-2xl font-semibold text-gray-800">
            Earnings History
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Track payments by booking for your accepted and completed care
            sessions.
          </p>
        </header>

        <div className="flex gap-8 items-start">
          {/* Left: summary cards */}
          <aside className="w-56 flex flex-col gap-4 h-fit shrink-0">

            <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-lg font-semibold text-gray-900 leading-none">
                    {formatRs(summaries.totalEarnings)}
                  </p>
                </div>
                <p className="text-sm text-gray-600">Total Earnings</p>
              </div>

              <div className="border-t border-green-300 my-4" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-lg font-semibold text-gray-900 leading-none">
                    {formatRs(summaries.thisMonth)}
                  </p>
                </div>
                <p className="text-sm text-gray-600">This Month Earnings</p>
              </div>
            </div>
          </aside>

          {/* Right: table */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-10 bg-green-50 border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-600" />
              </div>
            ) : earningsRows.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-5 text-center text-gray-600 text-sm">
                No accepted or completed bookings yet. Earnings will appear here
                once you have active sessions.
              </div>
            ) : (
              <div className="bg-green-50 border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-auto w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="py-2 px-3 text-left text-xs font-semibold uppercase text-green-800 w-[1%] whitespace-nowrap">
                          Date
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold uppercase text-green-800 min-w-[5.5rem] max-w-[9rem]">
                          Care seeker name
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold uppercase text-green-800 min-w-[6rem] max-w-[11rem]">
                          Service type
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold uppercase text-green-800 w-[1%] whitespace-nowrap">
                          Amount
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold uppercase text-green-800 w-[1%] whitespace-nowrap">
                          Payment status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsRows.map((b) => {
                        const paid = b.payment_status === "paid";
                        return (
                          <tr
                            key={b.id}
                            className="border-t border-green-200 text-sm hover:bg-green-100"
                          >
                            <td className="py-2 px-3 text-gray-800 whitespace-nowrap align-top">
                              {formatBookingDate(b.date)}
                            </td>
                            <td className="py-2 px-3 text-gray-800 font-medium align-top break-words max-w-[9rem]">
                              {b.family_name || "—"}
                            </td>
                            <td className="py-2 px-3 text-gray-600 align-top break-words max-w-[11rem]">
                              {serviceTypesLabel(b.service_types)}
                            </td>
                            <td className="py-2 px-3 text-gray-800 font-medium whitespace-nowrap align-top">
                              {formatRs(parseAmount(b.total_amount))}
                            </td>
                            <td className="py-2 px-3 align-top whitespace-nowrap">
                              <span
                                className={
                                  paid
                                    ? "inline-block bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs"
                                    : "inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsHistoryPage;
