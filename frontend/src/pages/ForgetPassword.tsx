import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/send-reset-password-email/", { email });
      setMessage("Password reset link sent to your email.");
    } catch (err) {
      setError("Unable to send reset email");
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
            Forgot Password
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter your email to receive a reset link
          </p>
        </div>

        {message && (
          <p className="text-green-600 text-sm mb-4 text-center">
            {message}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Button */}
        <button
          className="w-full bg-green-500 hover:bg-green-600
            text-white py-3 rounded-md
            font-semibold text-sm transition"
        >
          Send Reset Link
        </button>

        {/* Back to login */}
        <p
          onClick={() => navigate("/login")}
          className="text-sm text-center text-green-600
            mt-5 cursor-pointer hover:underline font-medium"
        >
          Back to Login
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
