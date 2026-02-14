import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, role, logout } = useAuth();

  const getHomePath = (userRole: string | null) => {
    if (userRole === "admin") return "/admin/dashboard";
    if (userRole === "caregiver") return "/caregiver/dashboard";
    return "/careseeker/dashboard";
  };

  const homePath = getHomePath(role);

  if (!isAuthenticated || !role) return null;

  const isActive = (path: string) =>
    location.pathname.startsWith(path)
      ? "text-green-600 font-semibold"
      : "text-gray-700";

  return (
    <div className="flex items-center justify-between px-6  bg-green-50">
      {/* Logo */}
      <Link to={homePath} className="flex items-center">
        <img src="/Logo.svg" alt="CareNest Logo" className="h-28" />
      </Link>

      {/* Center Navigation (Role-based) */}
      <div className="flex items-center gap-16 mt-5 text-md">
        <Link to={homePath} className={isActive(homePath)}>
          Dashboard
        </Link>

        {/* ADMIN */}
        {role === "admin" && (
          <>
            <Link to="/admin/users" className={isActive("/admin/users")}>
              Manage Users
            </Link>
            <Link to="/admin/verify-caregivers" className={isActive("/admin/verify-caregivers")}>
              Verify Caregivers
            </Link>
            <Link to="/admin/reports" className={isActive("/admin/reports")}>
              Reports
            </Link>
          </>
        )}

        {/* CARE SEEKER */}
        {role === "careseeker" && (
          <>
            <Link to="/careseeker/find-caregiver" className={isActive("/careseeker/find-caregiver")}>
              Find Caregiver
            </Link>
            <Link to="/careseeker/bookings" className={isActive("/careseeker/bookings")}>
              My Bookings
            </Link>
          </>
        )}

        {/* CAREGIVER */}
        {role === "caregiver" && (
          <>

            <Link to="/messages" className={isActive("/messages")}>
              Messages
            </Link>
            <Link to="/caregiver/booking-requests" className={isActive("/caregiver/booking-requests")}>
              Booking Requests
            </Link>
          </>
        )}

        
        {role !== "admin" && (
          <Link to="/profile" className={isActive("/profile")}>
            Profile
          </Link>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 mt-3.5 rounded-lg text-sm"
      >
        Log out
      </button>
    </div>
  );
};

export default Navbar;
