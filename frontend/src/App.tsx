import { BrowserRouter, Routes, Route } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";

import CareseekerDashboard from "./pages/CareseekerDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import CaregiverUpload from "./pages/CaregiverUpload";
import AdminVerify from "./pages/AdminVerify";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminComplaints from "./pages/AdminComplaints";
import AdminSendAnnouncementPage from "./pages/AdminSendAnnouncementPage";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import EmergencyPage from "./pages/EmergencyPage";
import CaregiverBookingRequests from "./pages/CaregiverBookingRequests";
import EarningsHistoryPage from "./pages/EarningsHistoryPage";
import ReviewsReceivedPage from "./pages/ReviewsReceivedPage";
import CareseekerBookings from "./pages/CareseekerBookings";
import MyComplaints from "./pages/careseeker/MyComplaints";
import PaymentVerify from "./pages/PaymentVerify";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import FavouritesPage from "./pages/FavouritesPage";


import Profile from "./pages/Profile";
import ProtectedRoute from "./utils/ProtectedRoute";
import FindCaregiver from "./pages/FindCaregiver";
import NotificationsPage from "./pages/NotificationsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* no login required - anyone can see signup/login/password reset */}
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* each role goes to their own dashboard after login */}
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

        {/* Profile - same page, but admin sees read-only view of any caregiver */}
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
        <Route
          path="/caregiver/:userId"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* caregivers upload citizenship + training cert here for admin review */}
        <Route
          path="/caregiver/upload-documents"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <CaregiverUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsersPage />
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
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminSendAnnouncementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/emergency-activity"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <EmergencyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <EmergencyPage />
            </ProtectedRoute>
          }
        />

        {/* booking workflow: careseeker creates -> caregiver responds -> completes */}
        <Route
          path="/careseeker/find-caregiver"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <FindCaregiver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-caregiver"
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
          path="/careseeker/complaints"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <MyComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favourites"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <FavouritesPage />
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
        <Route
          path="/caregiver/earnings-history"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <EarningsHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/reviews-received"
          element={
            <ProtectedRoute allowedRoles={["caregiver"]}>
              <ReviewsReceivedPage />
            </ProtectedRoute>
          }
        />

        {/* Payment verification - handles Khalti redirect */}
        <Route
          path="/payment/verify"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <PaymentVerify />
            </ProtectedRoute>
          }
        />

        {/* Payment History */}
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={["careseeker"]}>
              <PaymentHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Messages - list and single conversation */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute allowedRoles={["careseeker", "caregiver"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
