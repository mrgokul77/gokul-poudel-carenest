import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import { emergencyApi } from "../api/axios";

type EmergencyStatus = "pending" | "in_progress" | "resolved";
type EmergencyTab = "active" | "resolved";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

interface EmergencyItem {
  id: number;
  careseeker: number;
  careseeker_name: string;
  careseeker_email: string;
  careseeker_phone: string | null;
  caregiver_name?: string | null;
  booking: number | null;
  booking_id: number | null;
  booking_status: string | null;
  status: EmergencyStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

const EMERGENCY_STATUS_META: Record<EmergencyStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-red-100 text-red-800 border-red-200" },
  in_progress: { label: "In Progress", className: "bg-orange-100 text-orange-800 border-orange-200" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 border-green-200" },
};

const DEFAULT_NOTIFY_MESSAGE =
  "A careseeker under your care has triggered an emergency alert. Please check on them immediately and contact admin if further assistance is needed.";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EmergencyPage() {
  const [tab, setTab] = useState<EmergencyTab>("active");
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState<number | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await emergencyApi.get<{ emergencies: EmergencyItem[] }>("");
      setEmergencies(Array.isArray(data.emergencies) ? data.emergencies : []);
    } catch {
      setEmergencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const intervalId = window.setInterval(loadData, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const pendingCount = useMemo(
    () => emergencies.filter((item) => item.status === "pending").length,
    [emergencies],
  );

  const activeEmergencies = useMemo(
    () => emergencies.filter((item) => item.status !== "resolved"),
    [emergencies],
  );

  const resolvedEmergencies = useMemo(
    () => emergencies.filter((item) => item.status === "resolved"),
    [emergencies],
  );

  const visibleEmergencies = tab === "active" ? activeEmergencies : resolvedEmergencies;

  const handleNotifyCaregiver = async (emergency: EmergencyItem) => {
    if (notifiedIds.includes(emergency.id)) {
      return;
    }

    setNotifyingId(emergency.id);
    try {
      await emergencyApi.post(`${emergency.id}/notify-caregiver/`, {
        message: DEFAULT_NOTIFY_MESSAGE,
      });
      setNotifiedIds((current) => Array.from(new Set([...current, emergency.id])));
      setToast({ type: "success", message: "Caregiver notified via email ✓" });
    } catch {
      setToast({ type: "error", message: "Failed to notify caregiver" });
    } finally {
      setNotifyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      {toast ? (
        <div className="fixed right-5 top-5 z-50">
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Emergency Cases</h1>
            <p className="mt-1 text-gray-600">Review careseeker emergency alerts and notify assigned caregivers.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh now
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "active" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {pendingCount > 0 ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> : null}
            Active Emergencies
          </button>
          <button
            type="button"
            onClick={() => setTab("resolved")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "resolved" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            Resolved Emergencies
          </button>
        </div>

        {loading ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading emergencies...</p>
          </div>
        ) : visibleEmergencies.length === 0 ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-500">No {tab === "active" ? "active" : "resolved"} emergencies found.</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-green-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Care Seeker</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Caregiver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Triggered At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleEmergencies.map((emergency, index) => {
                  const meta = EMERGENCY_STATUS_META[emergency.status] ?? EMERGENCY_STATUS_META.pending;
                  const alreadyNotified = notifiedIds.includes(emergency.id);

                  return (
                    <tr
                      key={emergency.id}
                      className={`${index % 2 === 0 ? "bg-green-50" : "bg-green-100/20"} hover:bg-green-100/80 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="font-medium">{emergency.careseeker_name}</div>
                        <div className="text-xs text-gray-500">{emergency.careseeker_phone ?? emergency.careseeker_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{emergency.caregiver_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(emergency.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleNotifyCaregiver(emergency)}
                            disabled={alreadyNotified || notifyingId === emergency.id}
                            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                              alreadyNotified
                                ? "border border-green-200 bg-green-50 text-green-700"
                                : "border border-blue-200 bg-blue-600 text-white hover:bg-blue-700"
                            } ${notifyingId === emergency.id ? "opacity-70" : ""}`}
                          >
                            {alreadyNotified
                              ? "Notified ✓"
                              : notifyingId === emergency.id
                                ? "Notifying..."
                                : "Notify Caregiver"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
