import { useEffect, useState } from "react";
import { BarChart3, Star } from "lucide-react";
import Navbar from "../components/Navbar";
import { reviewsApi } from "../api/axios";
import { resolveBackendMediaUrl } from "../utils/media";

type ReviewRow = {
  id: number;
  careseeker: number;
  careseeker_name?: string;
  careseeker_profile_image?: string | null;
  service_types?: string[];
  rating: number;
  comment: string;
  created_at: string;
};

type ReviewsPayload = {
  average_rating: number;
  review_count: number;
  reviews: ReviewRow[];
};

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

const ReviewsReceivedPage = () => {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 4;

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await reviewsApi.get(`caregiver/${id}/`);
        setData(res.data as ReviewsPayload);
      } catch {
        setError("Could not load reviews.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const reviews = data?.reviews ?? [];
  const totalPages = Math.max(1, Math.ceil(reviews.length / reviewsPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedReviews = reviews.slice(
    (clampedPage - 1) * reviewsPerPage,
    clampedPage * reviewsPerPage
  );

  const renderStars = (rating: number, sizeClass = "w-4 h-4") =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClass} ${i < Math.round(rating) ? "text-yellow-400 fill-current" : "text-green-200"}`}
      />
    ));

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />
          </div>
        ) : error ? (
          <p className="text-center text-gray-600 py-10">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-60 bg-green-50 border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">Your Summary</h3>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Reviews</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Ratings and feedback from families you have cared for.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <aside className="w-60 h-fit">
                <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {data?.average_rating?.toFixed(1) ?? "—"}
                    <span className="text-sm font-medium"> / 5</span>
                  </p>
                  <div className="flex items-center gap-1 text-yellow-400 mt-2">
                    {renderStars(data?.average_rating ?? 0)}
                  </div>
                </div>

                <div className="border-t border-green-300 my-4" />

                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="font-bold text-gray-900 mt-1">{data?.review_count ?? 0}</p>
                </div>
              </div>
              </aside>

              <section className="flex-1">
                {!reviews.length ? (
                  <div className="bg-green-50 border border-green-300 rounded-2xl shadow-sm p-6">
                    <p className="text-gray-700">
                      No reviews yet. Completed bookings with ratings will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-6">
                      {paginatedReviews.map((r) => (
                        <li
                          key={r.id}
                          className="bg-green-50 border border-green-300 border-l-4 border-l-green-500 rounded-2xl shadow-sm p-6"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              {r.careseeker_profile_image ? (
                                <img
                                  src={resolveBackendMediaUrl(r.careseeker_profile_image) || ""}
                                  alt={r.careseeker_name || "Careseeker"}
                                  className="w-12 h-12 rounded-full object-cover border border-green-300"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center font-semibold text-green-800">
                                  {getInitials(r.careseeker_name)}
                                </div>
                              )}
                              <p className="font-semibold text-gray-900">
                                {r.careseeker_name || "Careseeker"}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">{formatDate(r.created_at)}</p>
                          </div>

                          <div className="flex items-center gap-1 text-yellow-400 text-sm mt-3">
                            {renderStars(r.rating)}
                          </div>

                          <p className="text-sm mt-2">
                            <span className="text-gray-600">Service:</span>{" "}
                            <span className="text-green-700 font-medium">
                              {r.service_types?.length
                                ? r.service_types.join(", ")
                                : "Caregiving Support"}
                            </span>
                          </p>

                          <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                            {r.comment || "No written comment."}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-end items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={clampedPage === 1}
                        className="border border-green-300 rounded-lg px-3 py-1 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {clampedPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={clampedPage === totalPages}
                        className="border border-green-300 rounded-lg px-3 py-1 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewsReceivedPage;
