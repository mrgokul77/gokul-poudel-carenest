import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/login/", {
        email,
        password,
      });

      // Store tokens via context
      login(res.data.token, res.data.role, res.data.user_id);

      // Role-based navigation
      const role = res.data.role;

      if (role === "careseeker") {
        navigate("/careseeker/dashboard");
      } else if (role === "caregiver") {
        navigate("/caregiver/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password");
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
          <div className="flex items-center mb-2">
            <img src="/Logo.svg" alt="Logo" className="h-28" />
            <div className="flex-1 h-[4px] bg-green-500 ml-4 rounded-full"></div>
          </div>

          {/* Text */}
          <h2 className="text-2xl font-semibold text-gray-800">Welcome back</h2>
          <p className="text-sm text-gray-500 mt-2">Log in to your account</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Email</label>
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

        {/* Password */}
        <div className="mb-2 relative">
          <label className="block text-sm text-gray-700 mb-1">Password</label>
          <input
            type={show ? "text" : "password"}
            className="w-full bg-transparent border border-gray-300
              rounded-md px-4 py-3 pr-10 text-sm
              focus:outline-none focus:border-green-500"
            placeholder="Enter your password"
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

        {/* Forgot password */}
        <p
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-green-600 cursor-pointer hover:underline mb-6"
        >
          Forgot password?
        </p>

        {/* Login button */}
        <button
          className="w-full bg-green-500 hover:bg-green-600
            text-white py-3 rounded-md
            font-semibold text-sm transition"
        >
          Log In
        </button>

        <p className="text-sm text-center text-gray-600 mt-5">
          Don&apos;t have an account?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-green-600 cursor-pointer hover:underline font-medium"
          >
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
};

export default Login;
