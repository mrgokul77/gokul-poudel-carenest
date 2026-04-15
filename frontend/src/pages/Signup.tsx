import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { extractApiError, UIErrorMessages } from "../utils/apiErrors";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("careseeker");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError({});

    const nextErrors: Record<string, string> = {};
    if (!username.trim()) nextErrors.username = "Full name is required.";
    if (!email.trim()) nextErrors.email = UIErrorMessages.emailRequired;
    if (!password.trim()) nextErrors.password = UIErrorMessages.passwordRequired;
    if (password && password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldError(nextErrors);
      return;
    }

    try {
      await api.post("/register/", {
        username,
        email,
        password,
        role,
      });

      // takes them to OTP screen after signup
      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      const msg = extractApiError(err, "Something went wrong on our end. Please try again later.");
      if (msg === UIErrorMessages.emailRequired || msg === UIErrorMessages.validEmail || msg.includes("email")) {
        setFieldError((prev) => ({ ...prev, email: msg }));
      } else if (msg === UIErrorMessages.passwordRequired || msg.includes("Password")) {
        setFieldError((prev) => ({ ...prev, password: msg }));
      } else if (msg.includes("name") || msg.includes("Full name")) {
        setFieldError((prev) => ({ ...prev, username: msg }));
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center
      bg-green-50"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-6">
          {/* Logo + line */}
          <div className="flex items-center mb-4">
            <img src="/Logo.svg" alt="Logo" className="h-28" />
            <div className="flex-1 h-[4px] bg-green-500 ml-4 rounded-full"></div>
          </div>

          {/* Text */}
          <h2 className="text-2xl font-semibold text-gray-800">
            Create an account
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Welcome to CareNest
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Username</label>
          <input
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter your Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {fieldError.username && <p className="text-red-500 text-xs mt-1">{fieldError.username}</p>}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {fieldError.email && <p className="text-red-500 text-xs mt-1">{fieldError.email}</p>}
        </div>

        {/* Password */}
        <div className="mb-4 relative">
          <label className="block text-sm text-gray-700 mb-1">Password</label>
          <input
            type={show ? "text" : "password"}
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 pr-10 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-10 text-gray-400"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {fieldError.password && <p className="text-red-500 text-xs mt-1">{fieldError.password}</p>}
        </div>

        <div className="mb-6 relative">
          <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
          <input
            type={show ? "text" : "password"}
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 pr-10 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Confirm your Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {fieldError.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldError.confirmPassword}</p>}
        </div>

        {/* Role */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-1">Role</label>
          <select
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 text-sm
              focus:outline-none focus:border-green-500"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="careseeker">Careseeker</option>
            <option value="caregiver">Caregiver</option>
          </select>
        </div>

        {/* Button */}
        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600
            text-white py-3 rounded-md
            font-semibold text-sm transition"
        >
          Sign Up
        </button>

        <p className="text-sm text-center text-gray-600 mt-5">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-green-600 cursor-pointer hover:underline font-medium"
          >
            Log In
          </span>
        </p>
      </form>
    </div>
  );
};

export default Signup;
