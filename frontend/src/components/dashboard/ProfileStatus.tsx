import { Link } from "react-router-dom";

interface ProfileStatusProps {
  verification_status?: string;
  service_types?: string[];
  hourly_rate?: number;
  available_hours?: string;
}

const ProfileStatus = ({
  verification_status,
  service_types,
  hourly_rate,
  available_hours,
}: ProfileStatusProps) => {
  const isVerified = verification_status === "approved";

  return (
    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">
        Profile Status
      </h2>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span
          className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${
            isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isVerified ? "Verified" : "Pending Verification"}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        {service_types?.length ? (
          <p>
            <span className="font-medium text-gray-800">Service Types: </span>
            {service_types.join(", ")}
          </p>
        ) : null}
        {hourly_rate != null && hourly_rate > 0 ? (
          <p>
            <span className="font-medium text-gray-800">Hourly Rate: </span>
            Rs {hourly_rate.toLocaleString("en-IN")}
          </p>
        ) : null}
        {available_hours ? (
          <p>
            <span className="font-medium text-gray-800">Working Hours: </span>
            {available_hours}
          </p>
        ) : null}
      </div>
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        Update Profile
      </Link>
    </div>
  );
};

export default ProfileStatus;
