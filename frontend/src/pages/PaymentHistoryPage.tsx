import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { paymentsApi } from "../api/axios";
import {
  CreditCard,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";

interface Payment {
  id: number;
  amount: string;
  status: string;
  transaction_id: string;
  created_at: string | null;
  booking_id: number;
  caregiver_name?: string;
}

const statusDisplay: Record<string, string> = {
  completed: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const statusBadgeStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function startOfDayLocal(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDayLocal(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

const PAGE_SIZE = 5;

const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterModalDateFrom, setFilterModalDateFrom] = useState("");
  const [filterModalDateTo, setFilterModalDateTo] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentsApi.get("/");
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? res.data;
      setPayments(data);
    } catch {
      setError("Failed to load payments");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const name = (p.caregiver_name || "").toLowerCase();
        const tid = (p.transaction_id || "").toLowerCase();
        const statusLabel = (
          statusDisplay[p.status] ||
          p.status ||
          ""
        ).toLowerCase();
        const amt = String(p.amount);
        const dateStr = formatDate(p.created_at).toLowerCase();
        const matchSearch =
          name.includes(q) ||
          tid.includes(q) ||
          statusLabel.includes(q) ||
          amt.includes(q) ||
          dateStr.includes(q);
        if (!matchSearch) return false;
      }

      if (filterDateFrom || filterDateTo) {
        if (!p.created_at) return false;
        const t = new Date(p.created_at).getTime();
        if (Number.isNaN(t)) return false;
        if (filterDateFrom && t < startOfDayLocal(filterDateFrom)) return false;
        if (filterDateTo && t > endOfDayLocal(filterDateTo)) return false;
      }

      return true;
    });
  }, [payments, searchQuery, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );

  const paginatedPayments = useMemo(
    () =>
      filteredPayments.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredPayments, currentPage],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDateFrom, filterDateTo]);

  const openFilterModal = () => {
    setFilterModalDateFrom(filterDateFrom);
    setFilterModalDateTo(filterDateTo);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    let from = filterModalDateFrom;
    let to = filterModalDateTo;
    if (from && to && from > to) {
      [from, to] = [to, from];
    }
    setFilterDateFrom(from);
    setFilterDateTo(to);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setFilterModalDateFrom("");
    setFilterModalDateTo("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Payment History
        </h2>

        {loading ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">
              {error ? "Could not load payments." : "No payments found."}
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6">
              <div className="bg-green-50 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by receiver, transaction ID, amount, or status"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={openFilterModal}
                  className="px-4 py-3.5 border border-gray-300 rounded-lg bg-green-50 text-gray-700 hover:bg-green-100 hover:border-green-400 flex items-center gap-2 text-sm font-medium shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </section>

            {filteredPayments.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
                <p className="text-gray-500">
                  No payments match your search or date range. Try changing the
                  search or filters.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Receiver Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="bg-green-50 hover:bg-green-100/80 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-800">
                          {formatDate(p.created_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {p.caregiver_name || "Caregiver"}
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          Rs {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                              statusBadgeStyles[p.status] ??
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {statusDisplay[p.status] ?? p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredPayments.length > 0 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showFilterModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Filter by date
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={filterModalDateFrom}
                  onChange={(e) => setFilterModalDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={filterModalDateTo}
                  onChange={(e) => setFilterModalDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryPage;
