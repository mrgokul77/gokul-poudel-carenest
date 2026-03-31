import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import DocumentVerificationModal from "../components/DocumentVerificationModal";
import api, { caregiverApi } from "../api/axios";
import {
  SummaryCards,
  QuickActions,
  RecentRequests,
  VerificationStatus,
  type RecentBooking,
} from "../components/dashboard";

const MODAL_SHOWN_KEY = "verification_modal_shown";

type ModalType = "incomplete_profile" | "verification_required" | "pending_review" | null;

interface ProfileData {
  phone?: string;
  address?: string;
  verification_status?: string | null;
  caregiver_details?: {
    gender?: string;
    training_authority?: string;
    certification_year?: number | string;
    available_hours?: string;
    hourly_rate?: number | string;
    service_types?: string[];
  };
}

interface DashboardSummary {
  pending_requests: number;
  upcoming_bookings: number;
  completed_services: number;
  total_earnings: number;
  recent_requests: RecentBooking[];
  profile: {
    verification_status: string;
    service_types: string[];
    hourly_rate: number;
    available_hours: string;
  };
}

const CaregiverDashboard = () => {
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const validateProfileCompleteness = (profile: ProfileData): string[] => {
    const errors: string[] = [];
    const details = profile.caregiver_details || {};
    const phone = profile.phone?.replace(/\D/g, "") || "";
    if (phone.length !== 10) errors.push("Phone (must be exactly 10 digits)");
    if (!profile.address?.trim()) errors.push("Address");
    if (!details.gender?.trim()) errors.push("Gender");
    if (!details.training_authority?.trim()) errors.push("Training Authority");
    if (!details.certification_year) errors.push("Certification Year");
    if (!details.available_hours?.trim()) errors.push("Available Hours");
    if (!details.hourly_rate || Number(details.hourly_rate) <= 0)
      errors.push("Hourly Rate (must be greater than 0)");
    if (!details.service_types?.length) errors.push("At least one Service Type");
    return errors;
  };

  const checkVerificationStatus = async () => {
    if (sessionStorage.getItem(MODAL_SHOWN_KEY) === "true") return;
    try {
      const res = await api.get("/profile/");
      const profile: ProfileData = res.data;
      const profileErrors = validateProfileCompleteness(profile);
      if (profileErrors.length > 0) {
        setModalType("incomplete_profile");
        setMissingFields(profileErrors);
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      } else if (profile.verification_status === "pending") {
        setModalType("pending_review");
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      } else if (
        !profile.verification_status ||
        profile.verification_status === "rejected"
      ) {
        setModalType("verification_required");
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      }
    } catch {
      // Ignore profile check errors
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await caregiverApi.get("dashboard-summary/");
      setSummary(res.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <DocumentVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        modalType={modalType}
        missingFields={missingFields}
      />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-800">
          Track bookings and connect with families.
          </h1>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
          </div>
        ) : summary ? (
          <>
            <SummaryCards
              pending_requests={summary.pending_requests}
              upcoming_bookings={summary.upcoming_bookings}
              completed_services={summary.completed_services}
              total_earnings={summary.total_earnings}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-1">
                <VerificationStatus status={summary.profile.verification_status} />
                <QuickActions variant="caregiver" layout="vertical" />
              </div>
              <div className="lg:col-span-2">
                <RecentRequests
                  requests={summary.recent_requests || []}
                  role="caregiver"
                  viewAllHref="/caregiver/booking-requests"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
            Failed to load dashboard. Please try again later.
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverDashboard;
