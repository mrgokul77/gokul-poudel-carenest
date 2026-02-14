import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Star,
  Check,
  CheckCircle,
  AlertCircle,
  Shield,
  Edit2,
  Camera,
} from "lucide-react";

// Available service types for caregiver profiles
const SERVICE_TYPES = [
  "Elderly Companionship",
  "Daily Living Assistance",
  "Personal Care Support",
  "Medication Reminders",
  "Meal Preparation",
  "Mobility Assistance",
  "Light Household Help",
  "Basic Health Monitoring",
];

// Descriptions shown in the services guide section
const SERVICES_GUIDE = [
  { name: "Elderly Companionship", description: "Support and companionship for older adults." },
  { name: "Daily Living Assistance", description: "Help with daily tasks such as dressing and mobility." },
  { name: "Meal Preparation", description: "Assistance with cooking and meal planning." },
  { name: "Medication Reminders", description: "Support to ensure medications are taken on time." },
  { name: "Light Household Help", description: "Basic cleaning and household assistance." },
  { name: "Personal Care Support", description: "Help with hygiene and personal care needs." },
];

const Profile = () => {
  const { userId: viewUserId } = useParams<{ userId: string }>();
  const isAdminView = Boolean(viewUserId);

  const [loading, setLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState<boolean>(false);

  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<any>(null);

  const [form, setForm] = useState({
    phone: "",
    address: "",
    profile_image: null as File | null,
  });

  const [caregiverForm, setCaregiverForm] = useState({
    service_types: [] as string[],
    training_authority: "",
    certification_year: "" as string | number,
    available_hours: "",
    bio: "",
    gender: "" as string,
  });

  /* --------------------------- LOAD PROFILE --------------------------- */

  useEffect(() => {
    loadProfile();
  }, [viewUserId]);

  useEffect(() => {
    if (isAdminView) setMode("view");
  }, [isAdminView]);

  const loadProfile = async () => {
    try {
      const url = isAdminView ? `/admin/profile/${viewUserId}/` : "/profile/";
      const res = await api.get(url);
      const data = res.data;

      setProfile(data);
      setVerificationStatus(data.verification_status || null);

      setForm({
        phone: data.phone || "",
        address: data.address || "",
        profile_image: null,
      });

      // backend image URL (persists on refresh/login)
      setImagePreview(data.profile_image || null);

      if (data.role === "caregiver" && data.caregiver_details) {
        setCaregiverForm({
          service_types: data.caregiver_details.service_types || [],
          training_authority: data.caregiver_details.training_authority || "",
          certification_year: data.caregiver_details.certification_year ?? "",
          available_hours: data.caregiver_details.available_hours || "",
          bio: data.caregiver_details.bio || "",
          gender: data.caregiver_details.gender || "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- INPUT HANDLERS --------------------------- */

  const handleCommonChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCaregiverChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "certification_year" && value !== "" && (Number(value) < 1900 || Number(value) > 2100)) {
      return;
    }
    setCaregiverForm({ ...caregiverForm, [name]: value });
  };

  const toggleServiceType = (type: string) => {
    if (caregiverForm.service_types.includes(type)) {
      setCaregiverForm({
        ...caregiverForm,
        service_types: caregiverForm.service_types.filter((t) => t !== type),
      });
    } else {
      setCaregiverForm({
        ...caregiverForm,
        service_types: [...caregiverForm.service_types, type],
      });
    }
  };

  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm({ ...form, profile_image: file });
    setImagePreview(URL.createObjectURL(file));
  };

  /* --------------------------- SAVE PROFILE --------------------------- */

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.append("phone", form.phone);
      fd.append("address", form.address);

      if (form.profile_image) {
        fd.append("profile_image", form.profile_image);
      }

      await api.patch("/profile/", fd);

      if (profile?.role === "caregiver") {
        const payload = {
          ...caregiverForm,
          certification_year:
            caregiverForm.certification_year === "" || caregiverForm.certification_year == null
              ? null
              : Number(caregiverForm.certification_year),
        };
        await api.patch("/profile/caregiver/", payload);
      }

      await loadProfile();
      setMode("view");

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Save failed", err);
      setMessage({
        type: "error",
        text: "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- LOADING --------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div
        className={
          profile?.role === "caregiver" || profile?.role === "careseeker"
            ? "max-w-6xl mx-auto px-6 py-10"
            : "max-w-3xl mx-auto px-6 py-10"
        }
      >
        {/* Admin view: simple back arrow to Verify Caregivers */}
        {isAdminView && (
          <div className="mb-4">
            <Link
              to="/admin/verify-caregivers"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Back to Verify Caregivers"
              aria-label="Back to Verify Caregivers"
            >
              ←
            </Link>
          </div>
        )}

        {/* Feedback Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        <div
          className={
            profile?.role === "caregiver" || profile?.role === "careseeker"
              ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              : ""
          }
        >
          {/* Left placeholder (admin view only) – preserves layout when Profile Tips hidden */}
          {isAdminView && (profile?.role === "caregiver" || profile?.role === "careseeker") && (
            <div className="lg:col-span-3 order-2 lg:order-1" aria-hidden="true" />
          )}
          {/* Left section – Profile Tips (careseeker: same layout/styling as caregiver); hidden in admin view */}
          {!isAdminView && profile?.role === "careseeker" && (
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6">
                <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                    i
                  </span>
                  Profile Tips
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Complete your profile to help caregivers understand your care needs.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Add accurate contact details for smooth communication.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Clearly describe care requirements when booking a caregiver.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Keep your location updated for better caregiver matching.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          {/* Left section – Profile Tips (caregiver only); hidden in admin view */}
          {!isAdminView && profile?.role === "caregiver" && (
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6">
                <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                    i
                  </span>
                  Profile Tips
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Add a clear profile photo so families can put a face to your name.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Keep your bio and availability up to date so care seekers know when you’re free.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>
                      Select the services you offer so you appear in the right searches.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Main profile form – center (caregiver), right (careseeker); same width in admin view */}
          <div
            className={
              profile?.role === "caregiver"
                ? "lg:col-span-6 order-1 lg:order-2"
                : profile?.role === "careseeker"
                  ? "lg:col-span-9 order-1 lg:order-2"
                  : ""
            }
          >
        <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md">
          <div className="px-6 md:px-8 pt-12 pb-10">
            {/* Profile heading: image + name + role */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
              <div className="relative shrink-0 -mt-4">
                <img
                  src={
                    imagePreview ||
                    `https://ui-avatars.com/api/?name=${profile?.username}&background=random`
                  }
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
                  alt="Profile"
                />
                {/* Green verified tick - bottom right of avatar (only for approved caregivers in view mode) */}
                {mode === "view" && profile?.role === "caregiver" && verificationStatus === "approved" && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
                {mode === "edit" && (
                  <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow cursor-pointer hover:bg-gray-100 border transition">
                    <Camera size={16} className="text-gray-600" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile?.username}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="py-0.5 px-2 rounded-full text-xs font-semibold bg-green-100 text-gray-700 uppercase">
                    {profile?.role}
                  </span>
                  {profile?.role === "caregiver" && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star size={14} className="text-yellow-500" />
                      <span className="font-semibold">
                        {profile?.average_rating ?? "0"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons – hidden when admin is viewing another user's profile (read-only) */}
            {!isAdminView && (
              <div className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-gray-200">
                {mode === "view" ? (
                  <>
                    {profile?.role === "caregiver" && (
                      <Link
                        to="/caregiver/upload-documents"
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Shield size={18} /> Upload Documents
                      </Link>
                    )}
                    <button
                      onClick={() => setMode("edit")}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
                    >
                      <Edit2 size={18} /> Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setMode("view")}
                      className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                    >
                      {saving && (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Section 1: Personal Details (stacked first) */}
            <div className="space-y-6 mb-10">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                <User size={20} className="text-green-600" /> Personal
                Information
              </h3>
              <div className="space-y-4">
                {/* Bio inside Personal Details (caregivers only) */}
                {profile?.role === "caregiver" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Bio
                    </label>
                    <p className="text-xs text-gray-500 mb-1">
                      Short introduction or experience summary for care seekers
                    </p>
                    {mode === "edit" ? (
                      <textarea
                        name="bio"
                        value={caregiverForm.bio}
                        onChange={handleCaregiverChange}
                        rows={3}
                        className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-y"
                        placeholder="e.g. Experienced in elder care. I enjoy helping families and providing compassionate support."
                      />
                    ) : (
                      <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700 whitespace-pre-wrap text-sm">
                        {caregiverForm.bio || "Not set"}
                      </div>
                    )}
                  </div>
                )}
                {/* Gender (caregivers only, optional) */}
                {profile?.role === "caregiver" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Gender <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    {mode === "edit" ? (
                      <select
                        name="gender"
                        value={caregiverForm.gender}
                        onChange={handleCaregiverChange}
                        className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    ) : (
                      <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700 text-sm">
                        {caregiverForm.gender === "male" && "Male"}
                        {caregiverForm.gender === "female" && "Female"}
                        {caregiverForm.gender === "prefer_not_to_say" && "Prefer not to say"}
                        {!caregiverForm.gender && "Not set"}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                    <Mail size={16} className="text-gray-400" />{" "}
                    {profile?.email}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Phone Number
                  </label>
                  {mode === "edit" ? (
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleCommonChange}
                      className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                      <Phone size={16} className="text-gray-400" />{" "}
                      {profile?.phone || "Not set"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Address
                  </label>
                  {mode === "edit" ? (
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleCommonChange}
                      className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="City, Area"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-700 bg-green-50 px-3 py-2.5 rounded-lg border border-gray-300">
                      <MapPin size={16} className="text-gray-400" />{" "}
                      {profile?.address || "Not set"}
                    </div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Section 2: Professional Details (below Personal, caregivers only) */}
            {profile?.role === "caregiver" && (
              <div className="space-y-6 mb-10">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                  <Briefcase size={20} className="text-green-600" />{" "}
                  Professional Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Training Authority
                    </label>
                    {mode === "edit" ? (
                      <input
                        type="text"
                        name="training_authority"
                        value={caregiverForm.training_authority}
                        onChange={handleCaregiverChange}
                        className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="e.g. Red Cross, State Board"
                      />
                    ) : (
                      <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                        {caregiverForm.training_authority || "Not set"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Certification Year
                    </label>
                    {mode === "edit" ? (
                      <input
                        type="number"
                        name="certification_year"
                        value={caregiverForm.certification_year}
                        onChange={handleCaregiverChange}
                        min={1900}
                        max={2100}
                        className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="e.g. 2022"
                      />
                    ) : (
                      <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                        {caregiverForm.certification_year || "Not set"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Availability
                    </label>
                    {mode === "edit" ? (
                      <input
                        name="available_hours"
                        value={caregiverForm.available_hours}
                        onChange={handleCaregiverChange}
                        className="w-full bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="e.g. Mon–Sat, 9AM – 6PM"
                      />
                    ) : (
                      <div className="bg-green-50 border border-gray-300 px-3 py-2.5 rounded-lg text-gray-700">
                        {caregiverForm.available_hours || "Flexible"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Services Offered (caregivers only) */}
            {profile?.role === "caregiver" && (
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Services Offered
                </h3>
                {mode === "edit" ? (
                  <div className="bg-green-50 border border-gray-300 rounded-lg px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      {SERVICE_TYPES.map((type) => (
                        <label
                          key={type}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                            caregiverForm.service_types.includes(type)
                              ? "bg-green-50 border-green-500 text-green-700"
                              : "bg-green-50 border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={caregiverForm.service_types.includes(type)}
                            onChange={() => toggleServiceType(type)}
                            className="accent-green-600 rounded"
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {caregiverForm.service_types.length > 0 ? (
                      caregiverForm.service_types.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic text-sm">
                        No specific services listed.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
          </div>

          {/* Right placeholder (admin view, caregiver only) – preserves layout when Service Guide hidden */}
          {isAdminView && profile?.role === "caregiver" && (
            <div className="lg:col-span-3 order-3" aria-hidden="true" />
          )}
          {/* Right section – Services Guide (caregiver only, elderly care); hidden in admin view */}
          {!isAdminView && profile?.role === "caregiver" && (
            <div className="lg:col-span-3 order-3">
              <div className="bg-green-50 border border-gray-200 rounded-xl p-5 sticky top-6">
                <h3 className="text-base font-bold text-gray-800 mb-3">
                  Services Guide
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Elderly care services you can offer in your profile.
                </p>
                <ul className="space-y-0 divide-y divide-gray-100">
                  {SERVICES_GUIDE.map((item) => (
                    <li key={item.name} className="py-3 first:pt-0">
                      <span className="text-sm font-semibold text-gray-800 block">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-600 block mt-0.5">
                        {item.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
