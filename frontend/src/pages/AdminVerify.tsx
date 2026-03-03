import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import CaregiverProfileCard from "../components/CaregiverProfileCard";
import type { CaregiverProfileCardData } from "../components/CaregiverProfileCard";
import api from "../api/axios";
import axios from "axios";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface VerificationRequest {
  id: number;
  user_id: number;
  email: string;
  username: string;
  profile_image?: string | null;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  uploaded_at: string;
  verified_by_email: string | null;
  citizenship_front_url: string | null;
  citizenship_back_url: string | null;
  certificate_url: string | null;
  certification_year: number | null;
  gender: string | null;
}

const AdminVerify = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Carousel state for document viewer
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [carouselDocuments, setCarouselDocuments] = useState<{ url: string; label: string }[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselRequest, setCarouselRequest] = useState<VerificationRequest | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const [profileModalUserId, setProfileModalUserId] = useState<number | null>(null);
  const [profileModalData, setProfileModalData] = useState<CaregiverProfileCardData | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/verifications/admin/list/?all=true",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        },
      );

      setRequests(res.data.results || res.data);
    } catch {
      setErrorMessage("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, error = false) => {
    error ? setErrorMessage(msg) : setSuccessMessage(msg);
    setTimeout(() => {
      setErrorMessage("");
      setSuccessMessage("");
    }, 4000);
  };

  const approveVerification = async (request: VerificationRequest) => {
    if (!confirm(`Approve verification for ${request.username}?`)) return;
    setProcessingId(request.id);
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/verifications/admin/${request.id}/verify/`,
        { verification_status: "approved" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        },
      );
      notify("Verification approved successfully");
      fetchRequests();
    } catch (err: any) {
      notify(err.response?.data?.error || "Approval failed", true);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectVerification = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setProcessingId(selectedRequest.id);
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/verifications/admin/${selectedRequest.id}/verify/`,
        {
          verification_status: "rejected",
          rejection_reason: rejectionReason,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        },
      );
      notify("Verification rejected");
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      notify(err.response?.data?.error || "Rejection failed", true);
    } finally {
      setProcessingId(null);
    }
  };

  const openProfileModal = async (userId: number) => {
    setProfileModalUserId(userId);
    setProfileModalData(null);
    setProfileModalLoading(true);
    try {
      const res = await api.get(`admin/profile/${userId}/`);
      console.log("[AdminVerify] Profile modal data:", res.data); // TEMP: verify caregiver fields
      setProfileModalData(res.data);
    } catch {
      setProfileModalData(null);
    } finally {
      setProfileModalLoading(false);
    }
  };

  const closeProfileModal = () => {
    setProfileModalUserId(null);
    setProfileModalData(null);
  };

  // Open carousel with all documents for a request
  const openDocumentCarousel = (req: VerificationRequest) => {
    const docs: { url: string; label: string }[] = [];
    if (req.citizenship_front_url) docs.push({ url: req.citizenship_front_url, label: "Citizenship Front" });
    if (req.citizenship_back_url) docs.push({ url: req.citizenship_back_url, label: "Citizenship Back" });
    if (req.certificate_url) docs.push({ url: req.certificate_url, label: "Certificate" });
    if (docs.length > 0) {
      setCarouselDocuments(docs);
      setCarouselRequest(req);
      setCarouselIndex(0);
      setShowCarouselModal(true);
    }
  };

  const nextDocument = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselDocuments.length);
  };

  const prevDocument = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselDocuments.length) % carouselDocuments.length);
  };

  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (filterStatus !== "all" && req.verification_status !== filterStatus) {
      return false;
    }
    
    // Gender filter
    if (filterGender !== "all") {
      if (filterGender === "male" && req.gender !== "male") return false;
      if (filterGender === "female" && req.gender !== "female") return false;
      if (filterGender === "prefer_not_to_say" && req.gender !== "prefer_not_to_say") return false;
    }
    
    return true;
  });

  // Sort filtered requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    }
    return 0;
  });

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterGender("all");
    setSortBy("recent");
  };

  // Apply search filter
  const searchedRequests = sortedRequests.filter(
    (req) =>
      req.username.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      req.email.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(searchedRequests.length / PAGE_SIZE);
  const paginatedRequests = searchedRequests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterGender, sortBy, appliedSearch]);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {successMessage && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
            <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Filter Caregivers */}
          <div className="lg:col-span-3 order-2 lg:order-1 hidden md:block">
            <div className="space-y-4 sticky top-6">
              {/* Filter Header */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter Caregivers
                </h3>
              </div>

              {/* Verification Status Filter Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Verification Status</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="filterStatus"
                        value={option.value}
                        checked={filterStatus === option.value}
                        onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "approved" | "rejected")}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Gender Filter Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Gender</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="filterGender"
                        value={option.value}
                        checked={filterGender === option.value}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Button Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <button
                  onClick={resetFilters}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-sm transition-all duration-200 hover:from-green-700 hover:to-green-600 hover:shadow-md active:scale-[0.98]"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Right: Main content */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Verify Caregivers</h2>

            {/* Search - full width above table, bg-green-50, neutral text/border */}
            <div className="relative w-full mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search caregivers by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAppliedSearch(e.target.value);
                }}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-base"
              />
            </div>

            {/* Table Content */}
        {loading ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-500">No {filterStatus} verifications found.</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-green-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-4 py-3 text-middle text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRequests.map((req) => {
                  const hasDocuments = req.citizenship_front_url || req.citizenship_back_url || req.certificate_url;
                  const actionDisabled =
                    req.verification_status !== "pending" ||
                    processingId !== null;

                  return (
                    <tr key={req.id} className="bg-green-50 text-center">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openProfileModal(req.user_id)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gray-200 text-gray-700 font-semibold text-sm hover:ring-2 hover:ring-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                          title="View profile"
                        >
                          {req.profile_image ? (
                            <img
                              src={req.profile_image}
                              alt={req.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{req.username?.charAt(0)?.toUpperCase() || "?"}</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {req.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(req.uploaded_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDocumentCarousel(req)}
                          disabled={!hasDocuments}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Document
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approveVerification(req)}
                            disabled={actionDisabled}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300 disabled:hover:text-gray-500"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setRejectionReason("");
                              setShowRejectModal(true);
                            }}
                            disabled={actionDisabled}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300 disabled:hover:text-gray-500"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

            {/* Pagination - below table */}
            {!loading && searchedRequests.length > 0 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg w-full max-w-md mx-4 border border-gray-200 shadow-lg">
            <h3 className="text-base font-medium text-gray-800 mb-3">
              Reject Verification for {selectedRequest.username}
            </h3>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded p-2.5 mb-4 text-sm bg-white focus:ring-2 focus:ring-gray-300 focus:border-gray-400 focus:outline-none"
              rows={4}
              placeholder="Reason for rejection (required)"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setSelectedRequest(null);
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
              >
                {/* Cancel button removed */}
              </button>
              <button
                onClick={rejectVerification}
                disabled={processingId === selectedRequest.id || !rejectionReason.trim()}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile card modal – same layout and content as main profile card */}
      {profileModalUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <button
              type="button"
              onClick={closeProfileModal}
              className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {profileModalLoading ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md flex items-center justify-center min-h-[200px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : (
              <CaregiverProfileCard profile={profileModalData} />
            )}
          </div>
        </div>
      )}

      {/* Document Carousel Modal */}
      {showCarouselModal && carouselDocuments.length > 0 && carouselRequest && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => {
              setShowCarouselModal(false);
              setCarouselDocuments([]);
              setCarouselRequest(null);
              setCarouselIndex(0);
            }}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous button */}
          <button
            onClick={prevDocument}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Image only */}
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center px-6">
            <img
              src={carouselDocuments[carouselIndex].url}
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain"
              alt={carouselDocuments[carouselIndex].label}
            />
          </div>

          {/* Next button */}
          <button
            onClick={nextDocument}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminVerify;
