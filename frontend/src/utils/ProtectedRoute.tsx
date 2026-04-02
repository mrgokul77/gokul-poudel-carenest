import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react/jsx-dev-runtime";

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading } = useAuth();

  // waits for auth state to load from localStorage (prevents flashing login page)
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // not logged in? send them to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // route requires specific role? check it
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
