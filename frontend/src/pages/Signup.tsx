import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("careseeker");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/register/", {
        username,
        email,
        password,
        role,
      });

      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        // Handle field-specific errors from DRF
        const firstError = Object.values(data).flat()[0];
        setError(typeof firstError === 'string' ? firstError : "Signup failed");
      } else {
        setError("Signup failed");
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
