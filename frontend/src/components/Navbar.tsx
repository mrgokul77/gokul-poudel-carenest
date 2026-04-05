import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, role, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getHomePath = (userRole: string | null) => {
    if (userRole === "admin") return "/admin/dashboard";
    if (userRole === "caregiver") return "/caregiver/dashboard";
    return "/careseeker/dashboard";
  };

  const homePath = getHomePath(role);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // don't show navbar until user is logged in and role is known
  if (!isAuthenticated || !role) return null;

  const isActive = (path: string) =>
    location.pathname.startsWith(path)
      ? "text-green-600 font-semibold"
      : "text-gray-700";

  const navLinks = (
    <>
      <Link to={homePath} className={isActive(homePath)}>
        Dashboard
      </Link>

      {role === "admin" && (
        <>
          <Link to="/admin/users" className={isActive("/admin/users")}>
            Manage Users
          </Link>
          <Link to="/admin/verify-caregivers" className={isActive("/admin/verify-caregivers")}>
            Verify Caregivers
          </Link>
          <Link to="/admin/bookings" className={isActive("/admin/bookings")}>
            Manage Bookings
          </Link>
        </>
      )}

      {role === "careseeker" && (
        <>
          <Link to="/careseeker/find-caregiver" className={isActive("/careseeker/find-caregiver")}>
            Find Caregiver
          </Link>
          <Link to="/careseeker/bookings" className={isActive("/careseeker/bookings")}>
            My Bookings
          </Link>
          <Link to="/messages" className={isActive("/messages")}>
            Messages
          </Link>
        </>
      )}

      {role === "caregiver" && (
        <>
          <Link to="/caregiver/booking-requests" className={isActive("/caregiver/booking-requests")}>
            Booking Requests
          </Link>
          <Link to="/messages" className={isActive("/messages")}>
            Messages
          </Link>
        </>
      )}

      {role !== "admin" && (
        <Link to="/profile" className={isActive("/profile")}>
          Profile
        </Link>
      )}
    </>
  );

  return (
    <div className="bg-green-50">
      {/* Desktop navbar - unchanged behavior */}
      <div className="hidden md:flex items-center justify-between px-6">
        <Link to={homePath} className="flex items-center">
          <img src="/Logo.svg" alt="CareNest Logo" className="h-28" />
        </Link>

        <div className="flex items-center gap-x-20 mt-5 text-md">{navLinks}</div>

        <button
          onClick={logout}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 mt-3.5 rounded-lg text-sm"
        >
          Log out
        </button>
      </div>

      {/* Mobile navbar with hamburger */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to={homePath} className="flex items-center">
            <img src="/Logo.svg" alt="CareNest Logo" className="h-14" />
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="mobile-menu-toggle border border-green-300 bg-white text-green-700 px-3 py-2 rounded-lg"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 text-sm">{navLinks}</div>
            <button
              type="button"
              onClick={logout}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
