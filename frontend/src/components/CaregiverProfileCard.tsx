import {
  User,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Star,
  Check,
} from "lucide-react";

export interface CaregiverProfileCardData {
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  profile_image?: string | null;
  role?: string;
  average_rating?: number | string | null;
  verification_status?: string | null;
  caregiver_details?: {
    service_types?: string[];
    training_authority?: string;
    certification_year?: number | string | null;
    available_hours?: string;
    bio?: string;
    gender?: string | null;
  } | null;
}

interface CaregiverProfileCardProps {
  profile: CaregiverProfileCardData | null;
}

/** Read-only profile card – same layout and styles as Profile page main card. */
const CaregiverProfileCard = ({ profile }: CaregiverProfileCardProps) => {
  if (!profile) return null;

  const cd = profile.caregiver_details;
  const imageUrl =
    profile.profile_image ||
    `https://ui-avatars.com/api/?name=${profile.username}&background=random`;

  return (
    <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md">
      <div className="px-6 md:px-8 pt-12 pb-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
          <div className="relative shrink-0 -mt-4">
            <img
              src={imageUrl}
              className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
              alt="Profile"
            />
            {/* Green verified tick - bottom right of avatar (only for approved caregivers) */}
            {profile.role === "caregiver" && profile.verification_status === "approved" && (
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900">{profile.username}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
              <span className="py-0.5 px-2 rounded-full text-xs font-semibold bg-green-100 text-gray-700 uppercase">
                {profile.role}
              </span>
              {profile.role === "caregiver" && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star size={14} className="text-yellow-500" />
                  <span className="font-semibold">
                    {profile.average_rating ?? "0"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-10">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
            <User size={20} className="text-green-600" /> Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                <Mail size={16} className="text-gray-400" /> {profile.email}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Phone Number
              </label>
              <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                <Phone size={16} className="text-gray-400" />{" "}
                {profile.phone || "Not set"}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Address
              </label>
              <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                <MapPin size={16} className="text-gray-400" />{" "}
                {profile.address || "Not set"}
              </div>
            </div>
            {profile.role === "caregiver" && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Bio
                </label>
                <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700 whitespace-pre-wrap text-sm">
                  {cd?.bio || "Not set"}
                </div>
              </div>
            )}
            {profile.role === "caregiver" && cd?.gender && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Gender
                </label>
                <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700 text-sm">
                  {cd.gender === "male" && "Male"}
                  {cd.gender === "female" && "Female"}
                  {cd.gender === "prefer_not_to_say" && "Prefer not to say"}
                </div>
              </div>
            )}
          </div>
        </div>

        {profile.role === "caregiver" && (
          <div className="space-y-6 mb-10">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Briefcase size={20} className="text-green-600" /> Professional
              Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Training Authority
                </label>
                <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                  {cd?.training_authority || "Not set"}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Certification Year
                </label>
                <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                  {cd?.certification_year || "Not set"}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Availability
                </label>
                <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                  {cd?.available_hours || "Flexible"}
                </div>
              </div>
            </div>
          </div>
        )}

        {profile.role === "caregiver" && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Services Offered
            </h3>
            <div className="flex flex-wrap gap-2">
              {(cd?.service_types?.length ?? 0) > 0 ? (
                (cd?.service_types ?? []).map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 italic text-sm">
                  No specific services listed.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverProfileCard;
