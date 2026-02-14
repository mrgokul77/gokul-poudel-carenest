import { BrowserRouter, Routes, Route } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";

import CareseekerDashboard from "./pages/CareseekerDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CaregiverUpload from "./pages/CaregiverUpload";
import AdminVerify from "./pages/AdminVerify";
import CaregiverBookingRequests from "./pages/CaregiverBookingRequests";
import CareseekerBookings from "./pages/CareseekerBookings";

import Profile from "./pages/Profile";
import ProtectedRoute from "./utils/ProtectedRoute";
import FindCaregiver from "./pages/FindCaregiver";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* No auth required - signup/login/password flows */}
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* Role-specific dashboards - each user type lands here after login */}
        <Route
          path="/careseeker/dashboard"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <CareseekerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/dashboard"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <CaregiverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Profile - same component, admin uses userId param for read-only view */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile/:userId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Caregiver verification flow */}
        <Route
          path="/caregiver/upload-documents"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <CaregiverUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verify-caregivers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminVerify />
            </ProtectedRoute>
          }
        />

        {/* Booking workflow - careseeker creates, caregiver responds */}
        <Route
          path="/careseeker/find-caregiver"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <FindCaregiver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/careseeker/bookings"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <CareseekerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/booking-requests"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <CaregiverBookingRequests />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
