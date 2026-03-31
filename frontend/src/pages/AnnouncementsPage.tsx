import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, ChevronLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { announcementsApi } from "../api/axios";
import type { DashboardAnnouncement } from "../components/dashboard/AnnouncementsSection";

const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${datePart} , ${timePart}`;
  } catch {
    return iso;
  }
}

function isRecentAnnouncement(createdAt: string) {
  try {
    return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
  } catch {
    return false;
  }
}

const AnnouncementsPage = () => {
  const { role } = useAuth();
  const dashboardPath =
    role === "caregiver" ? "/caregiver/dashboard" : "/careseeker/dashboard";

  const [items, setItems] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await announcementsApi.get("");
        const list = res.data?.announcements ?? [];
        if (!cancelled) {
          setItems(Array.isArray(list) ? list : []);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          to={dashboardPath}
          className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Announcements</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />
          </div>
        ) : error ? (
          <p className="text-center text-gray-600 text-sm py-8">
            Could not load announcements.
          </p>
        ) : !items.length ? (
          <p className="text-center text-gray-600 text-sm py-8">No announcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => {
              const isOpen = expanded[a.id] ?? false;
              const showNew = isRecentAnnouncement(a.created_at);

              return (
                <li
                  key={a.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-5"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Megaphone
                        className="w-5 h-5 text-green-600 shrink-0"
                        aria-hidden
                      />
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {a.title}
                      </h2>
                    </div>
                    {showNew && (
                      <span className="shrink-0 bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        New
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-gray-700 mt-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      !isOpen ? "line-clamp-3" : ""
                    }`}
                  >
                    {a.message}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [a.id]: !isOpen,
                      }))
                    }
                    className="text-green-700 text-sm font-medium underline mt-3 bg-transparent border-0 p-0 cursor-pointer text-left hover:text-green-800"
                  >
                    {isOpen ? "Read less" : "Read More"}
                  </button>

                  <p className="text-xs text-gray-500 mt-4">
                    {formatDateTime(a.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
