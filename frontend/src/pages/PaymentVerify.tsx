import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { paymentsApi } from "../api/axios";

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const pidx = searchParams.get("pidx");
      const transactionStatus = searchParams.get("status");

      if (!pidx) {
        setStatus("failed");
        setMessage("Missing payment reference");
        return;
      }

      // If Khalti returns failed status directly
      if (transactionStatus === "Failed") {
        setStatus("failed");
        setMessage(`Payment ${transactionStatus.toLowerCase()}`);
        return;
      }

      try {
        const response = await paymentsApi.post("verify/", { pidx });
        setStatus("success");
        setMessage(response.data.message || "Payment verified successfully");

        // Redirect to bookings after 3 seconds
        setTimeout(() => {
          navigate("/careseeker/bookings");
        }, 3000);
      } catch (error: any) {
        setStatus("failed");
        setMessage(error.response?.data?.error || "Payment verification failed");
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          {status === "verifying" && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">Please wait while we verify your payment...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to your bookings...</p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => navigate("/careseeker/bookings")}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Back to Bookings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentVerify;
