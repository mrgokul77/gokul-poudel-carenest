import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, Star, User } from "lucide-react";
import Navbar from "../components/Navbar";
import { resolveBackendMediaUrl } from "../utils/media";

interface FavouriteCaregiver {
  id: number;
  name?: string;
  profile_photo?: string | null;
  rating?: number | null;
  service_type?: string[];
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

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-green-50 border border-gray-200 shadow-sm rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 mb-4">
              <Heart className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-800">My Favourites</h1>
            <p className="mt-2 text-sm text-gray-600">Your saved caregivers</p>
          </div>

          {favourites.length === 0 ? (
            <div className="mt-8 text-center text-gray-600 leading-relaxed">
              No favourites yet. Browse caregivers and tap ❤️ to save them here.

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => navigate("/careseeker/find-caregiver")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  Browse Caregivers
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {favourites.map((caregiver) => {
                const imageUrl =
                  resolveBackendMediaUrl(caregiver.profile_photo) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    caregiver.name || "Caregiver",
                  )}&background=random`;

                return (
                  <div
                    key={caregiver.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <img
                      src={imageUrl}
                      alt={caregiver.name || "Caregiver"}
                      className="h-16 w-16 rounded-full object-cover border border-gray-200 bg-gray-100"
                    />

                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {caregiver.name || "Unnamed caregiver"}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {typeof caregiver.rating === "number"
                            ? caregiver.rating.toFixed(1)
                            : "New"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          {caregiver.service_type?.length
                            ? caregiver.service_type.join(", ")
                            : "No services listed"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/caregiver/${caregiver.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-500 text-green-600 font-medium hover:bg-green-50 transition-colors"
                      >
                        View Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFavourite(caregiver.id)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavouritesPage;