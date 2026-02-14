import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api/axios";

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      await api.post(`/reset-password/${uid}/${token}/`, { password });
      navigate("/login");
    } catch (err) {
      setError("Invalid or expired reset link");
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
            Reset Password
          </h2>
          <p className="text-sm text-gray-500 mt-2">Enter your new password</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        {/* New password */}
        <div className="mb-4 relative">
          <label className="block text-sm text-gray-700 mb-1">
            New Password
          </label>
          <input
            type={show ? "text" : "password"}
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 pr-10 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm password */}
        <div className="mb-6 relative">
          <label className="block text-sm text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type={show ? "text" : "password"}
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 pr-10 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Reset button */}
        <button
          className="w-full bg-green-500 hover:bg-green-600
            text-white py-3 rounded-md
            font-semibold text-sm transition"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
