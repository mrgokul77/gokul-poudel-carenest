import { useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";

interface DocumentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentVerificationModal = ({ isOpen, onClose }: DocumentVerificationModalProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleVerifyClick = () => {
    onClose();
    navigate("/caregiver/upload-documents");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <AlertCircle className="text-green-600" size={32} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
          Document Verification Required
        </h2>

        {/* Body text */}
        <p className="text-gray-600 text-center mb-4">
          Your documents have not been verified yet. Please submit the required documents to continue using all caregiver features.
        </p>

        {/* Bullet points */}
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

        {/* Primary action button */}
        <button
          onClick={handleVerifyClick}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-semibold text-sm transition"
        >
          Verify Documents
        </button>
      </div>
    </div>
  );
};

export default DocumentVerificationModal;
