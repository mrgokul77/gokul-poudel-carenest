import React, { useState, useEffect } from "react";
import { X, ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { complaintsApi } from "../api/axios";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: number;
    caregiver_name?: string;
    family_name?: string;
    status: string;
  };
  onSuccess: () => void;
  role?: "caregiver" | "careseeker";
}

interface UserComplaint {
  id: number;
  category: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
}

// Careseeker complaint categories
const CARESEEKER_CATEGORIES = [
  {
    group: "Before/During Service",
    options: [
      "Caregiver was late or didn't show up",
      "Caregiver left early without completing service",
      "Unprofessional or rude behavior",
      "Safety concern or harmful behavior",
      "Caregiver didn't follow care instructions",
    ],
  },
  {
    group: "After Service",
    options: [
      "Poor quality of care provided",
      "Overcharged / wrong billing",
      "Refund not received",
      "Care recipient was left unattended",
    ],
  },
  {
    group: "Booking/Platform Issue (any time)",
    options: [
      "Booking cancelled without notice",
      "Wrong caregiver assigned",
      "App showed wrong schedule or details",
      "Other",
    ],
  },
];

// Caregiver complaint categories
const CAREGIVER_CATEGORIES = [
  {
    group: "Before/During Service",
    options: [
      "Careseeker was not present at the location",
      "Careseeker was rude or disrespectful",
      "Unsafe or uncomfortable environment",
      "Care recipient had undisclosed medical condition",
    ],
  },
  {
    group: "After Service",
    options: [
      "Payment not received",
      "Wrong payment amount",
      "Careseeker left a false review",
    ],
  },
  {
    group: "Booking/Platform Issue (any time)",
    options: [
      "Booking cancelled without notice",
      "Wrong careseeker details shown",
      "App showed wrong schedule or details",
      "Other",
    ],
  },
];

const CATEGORIES: Record<string, typeof CARESEEKER_CATEGORIES> = {
  careseeker: CARESEEKER_CATEGORIES,
  caregiver: CAREGIVER_CATEGORIES,
};

const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
  role = "careseeker",
}) => {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingComplaints, setExistingComplaints] = useState<UserComplaint[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchExistingComplaints();
    }
  }, [isOpen, booking.id]);

  const fetchExistingComplaints = async () => {
    setLoadingExisting(true);
    try {
      const res = await complaintsApi.get(`my-complaints/?booking_id=${booking.id}`);
      setExistingComplaints(res.data);
    } catch (err) {
      console.error("Failed to fetch existing complaints", err);
    } finally {
      setLoadingExisting(false);
    }
  };

  if (!isOpen) return null;

  const activeComplaintCategories = existingComplaints
    .filter((c) => ["open", "investigating"].includes(c.status))
    .map((c) => c.category);

  const allCategoriesDisabled = CATEGORIES[role].every((group) =>
  group.options.every((opt) => activeComplaintCategories.includes(opt))
);

  const handleSubmit = async () => {
    if (description.length < 20) {
      setError("Description must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await complaintsApi.post("file/", {
        booking_id: booking.id,
        category,
        description,
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      const data = err.response?.data;
      let errorMsg = "Failed to file complaint.";
      
      if (typeof data === "string") {
        errorMsg = data;
      } else if (data?.error) {
        errorMsg = data.error;
      } else if (data?.detail) {
        errorMsg = data.detail;
      } else if (data && typeof data === "object") {
        // Handle DRF field errors (e.g. { "description": ["Too short"] })
        errorMsg = Object.values(data).flat().join(" ");
      }
      
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCategory("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-[520px] mx-auto overflow-hidden relative p-7">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
          disabled={submitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">File a Complaint</h3>
          <p className="text-sm text-gray-500">
            Booking for {role === "caregiver" ? "careseeker" : "caregiver"} <span className="font-semibold text-gray-800">
              {role === "caregiver" ? (booking.family_name || "N/A") : (booking.caregiver_name || "N/A")}
            </span>
          </p>
        </div>

        <div className="space-y-6">
          {loadingExisting ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Checking your complaints...</p>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-4">What's the issue?</h4>

                {allCategoriesDisabled ? (
                  <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      You have active complaints covering all issue types for this booking. Please wait for them to be reviewed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {CATEGORIES[role].map((group) => (
                      <div key={group.group}>
                        <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
                          {group.group}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((opt) => {
                            const isAlreadyReported = activeComplaintCategories.includes(opt);
                            return (
                              <div key={opt} className="flex flex-col gap-1">
                                <button
                                  onClick={() => setCategory(opt)}
                                  disabled={isAlreadyReported}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    category === opt
                                      ? "bg-green-100 text-green-800 border-green-200 font-semibold shadow-sm"
                                      : isAlreadyReported
                                      ? "bg-gray-100 text-gray-400 border-transparent cursor-not-allowed opacity-60"
                                      : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                                  }`}
                                >
                                  {opt}
                                </button>
                                {isAlreadyReported && (
                                  <span className="text-[10px] text-amber-600 font-semibold px-1">
                                    Already reported
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                {!allCategoriesDisabled && (
                  <button
                    onClick={() => setStep(2)}
                    disabled={!category}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Continue
                  </button>
                )}
                {allCategoriesDisabled && (
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep(1)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                    {category}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-gray-800 mb-2">Tell us more</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Please provide at least 20 characters describing the incident.
                </p>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-h-[160px] resize-none"
                  placeholder="Explain what happened in detail..."
                />
                <p className="text-right text-xs text-gray-400 mt-2">
                  {description.length} / 20 characters minimum
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || description.length < 20}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Submit Complaint
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;
