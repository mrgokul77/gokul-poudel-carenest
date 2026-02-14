import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import {
  UploadCloud,
  Info,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface VerificationData {
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  citizenship_front_url: string | null;
  citizenship_back_url: string | null;
  certificate_url: string | null;
  can_reupload: boolean;
}

const CaregiverUpload = () => {
  const [citizenshipFront, setCitizenshipFront] = useState<File | null>(null);
  const [citizenshipBack, setCitizenshipBack] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/verifications/status/",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );
      if (res.data.verification_status !== undefined) {
        setVerificationData({
          verification_status: res.data.verification_status,
          rejection_reason: res.data.rejection_reason || null,
          citizenship_front_url: res.data.citizenship_front_url || null,
          citizenship_back_url: res.data.citizenship_back_url || null,
          certificate_url: res.data.certificate_url || null,
          can_reupload: res.data.can_reupload || false,
        });
      } else {
        setVerificationData(null);
      }
    } catch (err) {
      console.error("Failed to fetch status", err);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return "Only PDF, JPEG, PNG files are allowed";
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than 5MB. Current size: ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)}MB`;
    }

    return null;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back" | "certificate"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
      }
      
      if (type === "front") {
        setCitizenshipFront(file);
        setFrontPreview(URL.createObjectURL(file));
      } else if (type === "back") {
        setCitizenshipBack(file);
        setBackPreview(URL.createObjectURL(file));
      } else {
        setCertificate(file);
        setCertificatePreview(URL.createObjectURL(file));
      }
      setError("");
    }
  };

  const handleUpload = async () => {
    setError("");
    setMessage("");

    if (!citizenshipFront || !citizenshipBack || !certificate) {
      setError("Please upload all required documents (Citizenship Front, Citizenship Back, and Certificate)");
      return;
    }

    setUploading(true);

    try {
      // Upload all documents in a single request
      const formData = new FormData();
      formData.append("citizenship_front", citizenshipFront);
      formData.append("citizenship_back", citizenshipBack);
      formData.append("certificate", certificate);
      
      const response = await axios.post(
        "http://127.0.0.1:8000/api/verifications/upload-document/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );

      setMessage(response.data.message || "All documents uploaded successfully!");

      // Clear file state
      setCitizenshipFront(null);
      setCitizenshipBack(null);
      setCertificate(null);
      setFrontPreview(null);
      setBackPreview(null);
      setCertificatePreview(null);
      
      // Reset file inputs
      const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => input.value = "");

      // Refetch status from backend
      await fetchStatus();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Upload failed";
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const hasAllDocuments = verificationData && 
    verificationData.citizenship_front_url && 
    verificationData.citizenship_back_url && 
    verificationData.certificate_url;
  
  const showUploadSection = !hasAllDocuments || verificationData?.can_reupload;
  const statusMessage = hasAllDocuments && verificationData
    ? verificationData.verification_status === "pending"
      ? "Documents submitted. Verification in progress."
      : verificationData.verification_status === "approved"
        ? "Your account is fully verified!"
        : `Rejected: ${verificationData.rejection_reason || 'Please re-upload your documents.'}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  const canSubmit = citizenshipFront && citizenshipBack && certificate && !uploading;

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT COLUMN: Profile Tips */}
          <div className="lg:w-1/3 h-fit bg-green-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-gray-900" size={24} />
              <h3 className="font-bold text-lg text-gray-900">
                Document Requirements
              </h3>
            </div>
            <ul className="space-y-4 text-gray-700 text-sm">
              <li className="flex gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span>Citizenship Front Image (required)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span>Citizenship Back Image (required)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span>Certificate Document (required)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span>Files must be PDF, JPEG, or PNG format</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span>Maximum file size: 5MB per file</span>
              </li>
            </ul>
          </div>

          {/* RIGHT COLUMN: Verify Documents */}
          <div className="lg:w-2/3 bg-green-50 border border-gray-200 rounded-xl p-8 shadow-sm">
            <h2 className="font-bold text-2xl text-gray-900 mb-2">
              Document Verification
            </h2>
            <p className="text-md text-gray-600 mb-8">
              Upload your citizenship documents (front and back) and certificate to verify your caregiver account. All documents are required.
            </p>

            {/* Status-only message when all required docs submitted */}
            {statusMessage && (
              <div
                className={`mb-6 p-5 rounded-lg border-2 ${
                  verificationData?.verification_status === "approved"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : verificationData?.verification_status === "rejected"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {verificationData?.verification_status === "approved" && (
                    <CheckCircle className="w-5 h-5 shrink-0" />
                  )}
                  {verificationData?.verification_status === "rejected" && (
                    <XCircle className="w-5 h-5 shrink-0" />
                  )}
                  {verificationData?.verification_status === "pending" && (
                    <Clock className="w-5 h-5 shrink-0" />
                  )}
                  <p className="font-medium text-base">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Upload section: hidden once all required documents are submitted */}
            {showUploadSection && (
              <>

            {/* Citizenship Front Upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Citizenship Front Image <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 transition">
                <UploadCloud className="text-gray-600 w-10 h-10 mb-2" />
                <input
                  type="file"
                  id="front-upload"
                  className="hidden"
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                  onChange={(e) => handleFileChange(e, "front")}
                />
                <label
                  htmlFor="front-upload"
                  className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold text-gray-700 shadow-sm transition cursor-pointer hover:bg-gray-50"
                >
                  Choose Front Image
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, JPEG, PNG • Max 5MB
                </p>
                {frontPreview && (
                  <div className="mt-4">
                    <img
                      src={frontPreview}
                      alt="Front Preview"
                      className="max-h-40 object-contain rounded border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Citizenship Back Upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Citizenship Back Image <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 transition">
                <UploadCloud className="text-gray-600 w-10 h-10 mb-2" />
                <input
                  type="file"
                  id="back-upload"
                  className="hidden"
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                  onChange={(e) => handleFileChange(e, "back")}
                />
                <label
                  htmlFor="back-upload"
                  className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold text-gray-700 shadow-sm transition cursor-pointer hover:bg-gray-50"
                >
                  Choose Back Image
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, JPEG, PNG • Max 5MB
                </p>
                {backPreview && (
                  <div className="mt-4">
                    <img
                      src={backPreview}
                      alt="Back Preview"
                      className="max-h-40 object-contain rounded border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Certificate Upload <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 transition">
                <UploadCloud className="text-gray-600 w-10 h-10 mb-2" />
                <input
                  type="file"
                  id="certificate-upload"
                  className="hidden"
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                  onChange={(e) => handleFileChange(e, "certificate")}
                />
                <label
                  htmlFor="certificate-upload"
                  className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold text-gray-700 shadow-sm transition cursor-pointer hover:bg-gray-50"
                >
                  Choose Certificate
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, JPEG, PNG • Max 5MB
                </p>
                {certificatePreview && (
                  <div className="mt-4">
                    <img
                      src={certificatePreview}
                      alt="Certificate Preview"
                      className="max-h-40 object-contain rounded border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </div>
                )}

                {message && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-700 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {message}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!canSubmit}
                  className={`w-full px-6 py-3 rounded-md font-semibold text-sm transition
                    ${
                      canSubmit
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </span>
                  ) : (
                    "Submit for Verification"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverUpload;
