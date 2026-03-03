import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, User, X } from "lucide-react";

type ModalType = "incomplete_profile" | "verification_required" | "pending_review" | null;

interface DocumentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalType: ModalType;
  missingFields?: string[];
}

const DocumentVerificationModal = ({ 
  isOpen, 
  onClose, 
  modalType,
  missingFields = []
}: DocumentVerificationModalProps) => {
  const navigate = useNavigate();

  if (!isOpen || !modalType) return null;

  const handleButtonClick = () => {
    onClose();
    if (modalType === "incomplete_profile") {
      navigate("/profile");
    } else if (modalType === "verification_required") {
      navigate("/caregiver/upload-documents");
    }
  };

  // Render "Complete Your Profile First" modal
  if (modalType === "incomplete_profile") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <User className="text-green-600" size={32} />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
            Complete Your Profile First
          </h2>

          <p className="text-gray-600 text-center mb-4">
            Please complete all required profile fields before submitting verification documents.
          </p>

          {missingFields.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">
                Missing required fields:
              </p>
              <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleButtonClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-semibold text-sm transition"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  // Render "Verification Under Review" modal
  if (modalType === "pending_review") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="text-yellow-600" size={32} />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
            Verification Under Review
          </h2>

          <p className="text-gray-600 text-center mb-4">
            Your documents have been submitted and are currently being reviewed by our team. This process typically takes 1-2 business days.
          </p>

          <ul className="text-gray-600 text-sm mb-6 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              <span>You will receive an email once verification is complete</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              <span>Some features may be limited until approval</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Render "Document Verification Required" modal (verification_required)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <AlertCircle className="text-green-600" size={32} />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
          Document Verification Required
        </h2>

        <p className="text-gray-600 text-center mb-4">
          Your documents have not been verified yet. Please submit the required documents to continue using all caregiver features.
        </p>

        <ul className="text-gray-600 text-sm mb-6 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Get listed in family search results</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Accept and manage bookings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Communicate with families</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Build trust through a verified profile</span>
          </li>
        </ul>

        <button
          onClick={handleButtonClick}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-semibold text-sm transition"
        >
          Verify Documents
        </button>
      </div>
    </div>
  );
};

export default DocumentVerificationModal;
