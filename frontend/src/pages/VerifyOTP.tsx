import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/verify-otp/", { email, otp });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid or expired OTP");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center
      bg-green-50"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md px-6">
        {/* Logo + heading */}
        <div className="mb-6">
          {/* Logo + line */}
          <div className="flex items-center mb-4">
            <img src="/Logo.svg" alt="Logo" className="h-28" />
            <div className="flex-1 h-[4px] bg-green-500 ml-4 rounded-full"></div>
          </div>

          {/* Text */}
          <h2 className="text-2xl font-semibold text-gray-800">
            Verify OTP
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter the OTP sent to your email
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        {/* OTP input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-1">
            OTP
          </label>
          <input
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 text-sm text-center tracking-widest
              focus:outline-none focus:border-green-500"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>

        {/* Verify button */}
        <button
          className="w-full bg-green-500 hover:bg-green-600
            text-white py-3 rounded-md
            font-semibold text-sm transition"
        >
          Verify
        </button>
      </form>
    </div>
  );
};

export default VerifyOTP;
