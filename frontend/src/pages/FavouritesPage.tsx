import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MapPin, MessageCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import { chatApi } from "../api/axios";
import { resolveBackendMediaUrl } from "../utils/media";

interface FavouriteCaregiver {
  id: number;
  name?: string;
  profile_photo?: string | null;
  rating?: number | null;
  service_types?: string[];
  service_type?: string[];
  location?: string | null;
  address?: string | null;
  hourly_rate?: number | null;
  total_reviews?: number;
}

const FavouritesPage = () => {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<FavouriteCaregiver[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("favourite_caregivers") || "[]",
    ) as FavouriteCaregiver[];
    setFavourites(Array.isArray(saved) ? saved : []);
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
              const imageUrl =
                resolveBackendMediaUrl(caregiver.profile_photo) ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  caregiver.name || "Caregiver",
                )}&background=random`;
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
                    className="absolute top-3 right-3 p-1.5 text-red-500"
                    aria-label="Remove from favourites"
                    title="Remove from favourites"
                  >
                    <Heart size={18} className="fill-red-500" />
                  </button>

                  <div className="flex gap-4 items-center">
                    <img
                      src={imageUrl}
                      alt={caregiver.name || "Caregiver"}
                      className="w-16 h-16 rounded-full object-cover border border-gray-200 bg-green-50 shrink-0"
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
                    <button
                      type="button"
                      onClick={() => navigate("/find-caregiver", { state: { openBookingForId: caregiver.id } })}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Request Care
                    </button>
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