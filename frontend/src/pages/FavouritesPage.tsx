import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MapPin, MessageCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import { bookingsApi, chatApi } from "../api/axios";
import VerifiedAvatar from "../components/VerifiedAvatar";

interface FavouriteCaregiver {
  id: number;
  name?: string;
  profile_photo?: string | null;
  verification_status?: string | null;
  rating?: number | null;
  service_types?: string[];
  service_type?: string[];
  location?: string | null;
  address?: string | null;
  hourly_rate?: number | null;
  total_reviews?: number;
}

interface BookingListItem {
  caregiver_id?: number;
  caregiver?: number;
  caregiver_details?: { id?: number | string };
  caregiver_info?: { id?: number | string };
  status?: string;
  booking_status?: string;
}

const FavouritesPage = () => {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<FavouriteCaregiver[]>([]);
  const [requestedCaregiverIds, setRequestedCaregiverIds] = useState<number[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("favourite_caregivers") || "[]",
    ) as FavouriteCaregiver[];
    setFavourites(Array.isArray(saved) ? saved : []);
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await bookingsApi.get<BookingListItem[]>("list/");
        const bookings = Array.isArray(res.data) ? res.data : [];

        const requested = bookings
          .filter((b) => {
            const status = b.status || b.booking_status;
            return (
              status === "pending" ||
              status === "accepted" ||
              status === "in_progress"
            );
          })
          .map((b: any) => {
            const id =
              b.caregiver_id ??
              b.caregiver ??
              b.caregiver_details?.id ??
              b.caregiver_info?.id ??
              null;
            return id !== null && id !== undefined ? Number(id) : null;
          })
          .filter((id): id is number => id !== null && !Number.isNaN(id));

        console.log("Bookings data:", bookings);
        console.log(
          "First booking keys:",
          bookings[0] ? Object.keys(bookings[0]) : "empty",
        );
        console.log("Requested IDs:", requested);
        console.log("Favourite IDs:", favourites.map((f) => f.id));

        setRequestedCaregiverIds(requested);
      } catch {
        setRequestedCaregiverIds([]);
      }
    };

    fetchBookings();
  }, []);

  const removeFavourite = (id: number) => {
    const updated = favourites.filter((f) => f.id !== id);
    localStorage.setItem("favourite_caregivers", JSON.stringify(updated));
    setFavourites(updated);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="hidden lg:block lg:col-span-3" />

          <div className="lg:col-span-9">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">My Favourites</h1>
          <p className="text-sm text-gray-500 mt-1">Your saved caregivers</p>
        </div>

        {favourites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg font-medium">No favourites yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Browse caregivers and tap ❤️ to save them here
            </p>
            <button
              type="button"
              onClick={() => navigate("/find-caregiver")}
              className="mt-6 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Browse Caregivers
            </button>
          </div>
        ) : (
          <ul className="space-y-5">
            {favourites.map((caregiver) => {
              const hasRequest = requestedCaregiverIds
                .map(Number)
                .includes(Number(caregiver.id));
              const serviceTypes = caregiver.service_types ?? caregiver.service_type ?? [];
              const location = caregiver.location ?? caregiver.address ?? "Location not set";
              const ratingText =
                typeof caregiver.rating === "number"
                  ? caregiver.rating.toFixed(1)
                  : "New";
              const reviewText =
                typeof caregiver.total_reviews === "number"
                  ? `(${caregiver.total_reviews} reviews)`
                  : "(0 reviews)";

              return (
                <li
                  key={caregiver.id}
                  className="relative bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-500 transition-colors cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => removeFavourite(caregiver.id)}
                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:text-red-600 transition-all"
                    aria-label="Remove from favourites"
                    title="Remove from favourites"
                  >
                    <Heart size={18} className="fill-red-500" />
                  </button>

                  <div className="flex gap-4 items-center">
                    <VerifiedAvatar
                      src={caregiver.profile_photo ?? null}
                      username={caregiver.name || "Caregiver"}
                      isVerified={caregiver.verification_status === "approved" || caregiver.verification_status == null}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-800 truncate">
                          {caregiver.name || "Unnamed caregiver"}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold">
                            {ratingText} {reviewText}
                          </span>
                        </div>
                      </div>

                      {serviceTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {serviceTypes.map((service) => (
                            <span
                              key={service}
                              className="px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md bg-green-200"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-500">{location}</span>
                      </div>

                      {typeof caregiver.hourly_rate === "number" && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-1 text-sm font-semibold text-green-700 bg-green-100 border border-green-200 rounded-lg">
                            Rs. {caregiver.hourly_rate} / hour
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    {hasRequest ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed"
                      >
                        Request Sent
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate("/find-caregiver", { state: { openBookingForId: caregiver.id } })}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Request Care
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                      aria-label="Open chat"
                      onClick={async () => {
                        try {
                          const res = await chatApi.post<{ conversation_id: number }>("start/", {
                            caregiver_id: caregiver.id,
                          });
                          navigate(`/messages/${res.data.conversation_id}`);
                        } catch {
                          navigate("/messages");
                        }
                      }}
                    >
                      <MessageCircle size={20} className="stroke-current" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FavouritesPage;