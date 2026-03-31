import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Megaphone } from "lucide-react";
import { announcementsApi } from "../../api/axios";

export interface DashboardAnnouncement {
  id: number;
  title: string;
  message: string;
  target_audience?: string;
  created_at: string;
}

interface AnnouncementsSectionProps {
  /** Max items to show in the preview (default 3) */
  previewLimit?: number;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const AnnouncementsSection = ({ previewLimit = 3 }: AnnouncementsSectionProps) => {
  const [items, setItems] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const preview = items.slice(0, previewLimit);

  return (
    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-800">Announcements</h2>
        </div>
        <Link
          to="/announcements"
          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
        </div>
      ) : error ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Could not load announcements.
        </p>
      ) : !preview.length ? (
        <p className="text-sm text-gray-500 text-center py-4">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {preview.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-gray-100 bg-white/60 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.message}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnnouncementsSection;
