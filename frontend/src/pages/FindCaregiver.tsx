import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import CaregiverProfileCard from "../components/CaregiverProfileCard";
import type { CaregiverProfileCardData } from "../components/CaregiverProfileCard";
import VerifiedAvatar from "../components/VerifiedAvatar";
import api, { bookingsApi } from "../api/axios";
import { Search, SlidersHorizontal, X, MapPin, MessageCircle } from "lucide-react";

interface Caregiver {
  user_id: number;
  username: string;
  email: string;
  service_types: string[];
  training_authority?: string;
  certification_year?: number | null;
  available_hours: string;
  profile_image?: string | null;
  bio?: string | null;
  gender?: string | null;
  verification_status?: string;
  address?: string | null;
}

interface BookingFormData {
  service_types: string[];
  person_name: string;
  person_age: string;
  date: string;
  start_time: string;
  duration_hours: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  additional_info: string;
}

// Keep in sync with Profile.tsx SERVICE_TYPES
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

const GENDER_OPTIONS = [
  { value: "", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "", label: "Select relationship" },
  { value: "Self", label: "Self" },
  { value: "Father", label: "Father" },
  { value: "Mother", label: "Mother" },
  { value: "Spouse", label: "Spouse" },
  { value: "Grandparent", label: "Grandparent" },
  { value: "Other", label: "Other" },
];

const FindCaregiver = () => {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterModalService, setFilterModalService] = useState("");
  const [filterModalLocation, setFilterModalLocation] = useState("");
  const [filterModalGender, setFilterModalGender] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<number | null>(null);
  const [profileModalData, setProfileModalData] = useState<CaregiverProfileCardData | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    service_types: [],
    person_name: "",
    person_age: "",
    date: "",
    start_time: "",
    duration_hours: 2,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    additional_info: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchCaregivers();
  }, [filterLocation, filterGender]);

  const fetchCaregivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.append("location", filterLocation);
      if (filterGender && filterGender !== "") params.append("gender", filterGender);
      
      const queryString = params.toString();
      const url = queryString ? `caregivers/?${queryString}` : "caregivers/";
      const res = await bookingsApi.get(url);
      setCaregivers(res.data);
    } catch {
      setError("Failed to load caregivers");
    } finally {
      setLoading(false);
    }
  };

  const filtered = caregivers.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.service_types &&
        c.service_types.some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    const matchService =
      !filterService ||
      (c.service_types && c.service_types.includes(filterService));
    return matchSearch && matchService;
  });

  const openBookingForm = (c: Caregiver) => {
    setSelectedCaregiver(c);
    setBookingForm({
      service_types: [],
      person_name: "",
      person_age: "",
      date: "",
      start_time: "",
      duration_hours: 2,
      emergency_contact_name: "",
      emergency_contact_phone: "",
      additional_info: "",
    });
    setError("");
    setMessage("");
    setShowBookingForm(true);
  };

  const closeBookingForm = () => {
    setShowBookingForm(false);
    setSelectedCaregiver(null);
  };

  const openProfileModal = async (c: Caregiver) => {
    setSelectedCaregiver(c);
    setProfileModalUserId(c.user_id);
    setProfileModalData(null);
    setProfileModalLoading(true);
    try {
      const res = await api.get(`admin/profile/${c.user_id}/`);
      setProfileModalData(res.data);
    } catch {
      setProfileModalData({
        username: c.username,
        email: c.email,
        role: "caregiver",
        verification_status: "approved",
        caregiver_details: {
          service_types: c.service_types,
          training_authority: c.training_authority,
          certification_year: c.certification_year,
          available_hours: c.available_hours,
          bio: c.bio || undefined,
          gender: c.gender || undefined,
        },
        profile_image: c.profile_image,
      });
    } finally {
      setProfileModalLoading(false);
    }
  };

  const closeProfileModal = () => {
    setProfileModalUserId(null);
    setProfileModalData(null);
    setSelectedCaregiver(null);
  };

  const submitBooking = async () => {
    if (!selectedCaregiver) return;

    if (bookingForm.service_types.length === 0) {
      setError("Please select at least one service");
      return;
    }
    if (!bookingForm.person_name) {
      setError("Please select the relationship");
      return;
    }
    if (!bookingForm.person_age || parseInt(bookingForm.person_age) <= 0) {
      setError("Please enter a valid age");
      return;
    }
    if (!bookingForm.date) {
      setError("Please select a date");
      return;
    }
    if (!bookingForm.start_time) {
      setError("Please select a start time");
      return;
    }
    if (!bookingForm.emergency_contact_phone.trim()) {
      setError("Please enter emergency contact phone number");
      return;
    }
    
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await bookingsApi.post("", {
        caregiver: selectedCaregiver.user_id,
        service_types: bookingForm.service_types,
        person_name: bookingForm.person_name,
        person_age: parseInt(bookingForm.person_age),
        date: bookingForm.date,
        start_time: bookingForm.start_time,
        duration_hours: bookingForm.duration_hours,
        emergency_contact_phone: bookingForm.emergency_contact_phone.trim(),
        additional_info: bookingForm.additional_info.trim() || undefined,
      });
      setMessage("Booking request sent successfully");
      setTimeout(() => {
        closeBookingForm();
      }, 1500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string; detail?: string } } };
      setError(ax.response?.data?.error || ax.response?.data?.detail || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const openFilterModal = () => {
    setFilterModalService(filterService);
    setFilterModalLocation(filterLocation);
    setFilterModalGender(filterGender);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setFilterService(filterModalService);
    setFilterLocation(filterModalLocation);
    setFilterGender(filterModalGender);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setFilterModalService("");
    setFilterModalLocation("");
    setFilterModalGender("");
    setFilterService("");
    setFilterLocation("");
    setFilterGender("");
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left – Tips for Hiring (same UI as Profile Tips) */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                  i
                </span>
                Hiring Tips
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Review caregiver profiles and bio via profile images</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Check verification status for safety</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Match services offered with your care needs</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Clearly mention requirements when requesting a booking</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right – Header, search, caregiver list */}
          <div className="lg:col-span-9 order-1 lg:order-2">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Find a Caregiver
          </h1>
          <p className="text-gray-600 text-[15px] leading-relaxed">
            Find the perfect caregiver for your loved ones .
          </p>
        </header>

        {/* Search & Filter */}
        <section className="mb-8">
          <div className="bg-green-50 flex gap-2">
            <div className="relative flex-1">
              <Search className=" absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by caregiver name or service type"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
            <button
              type="button"
              onClick={openFilterModal}
              className="px-4 py-3.5 border border-gray-300 rounded-lg bg-green-50 text-gray-700 hover:bg-green-100 hover:border-green-400 flex items-center gap-2 text-sm font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>
          </div>
        </section>

        {/* Caregiver listing */}
        {loading ? (
          <div className="py-14 text-center text-gray-500">
            Loading caregivers...
          </div>
        ) : error ? (
          <div className="py-14 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-500">
            No verified caregivers match your filters. Try changing the search or
            filters.
          </div>
        ) : (
          <ul className="space-y-5">
            {filtered.map((c) => (
              <li
                key={c.user_id}
                className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-500 transition-colors cursor-pointer"
                onClick={() => openProfileModal(c)}
              >
                <div className="flex gap-4 items-center">
                  {/* Profile photo with verified tick */}
                  <VerifiedAvatar
                    src={c.profile_image && !imageErrors[c.user_id] ? c.profile_image : null}
                    username={c.username}
                    isVerified={c.verification_status === "approved"}
                    size="md"
                    onClick={() => openProfileModal(c)}
                    onImageError={() => setImageErrors((prev) => ({ ...prev, [c.user_id]: true }))}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-semibold text-gray-800">{c.username}</h2>
                    </div>

                    {c.bio && (
                      <p
                        className="text-sm font-semibold text-gray-800 mb-1.5 overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical" as const,
                        }}
                      >
                        {c.bio}
                      </p>
                    )}

                    {c.service_types && c.service_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {c.service_types.map((service) => (
                          <span
                            key={service}
                            className="px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md bg-green-200"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {c.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-500">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {c.has_active_booking ? (
                      <div className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                        Request Sent
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBookingForm(c);
                        }}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Request Care
                      </button>
                    )}
                    <div
                      className="relative"
                      title="Chat coming soon"
                    >
                      <button
                        type="button"
                        disabled
                        className="p-2 text-white-500 rounded-lg cursor-not-allowed opacity-50"
                        aria-label="Chat coming soon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={20} className="stroke-current" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
          </div>
        </div>
      </div>

      {/* Filter modal */}
      {showFilterModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Filter Caregivers
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service Type
                </label>
                <select
                  value={filterModalService}
                  onChange={(e) => setFilterModalService(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                >
                  <option value="">All Services</option>
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={filterModalLocation}
                  onChange={(e) => setFilterModalLocation(e.target.value)}
                  placeholder="City or area"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Gender
                </label>
                <select
                  value={filterModalGender}
                  onChange={(e) => setFilterModalGender(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile card modal – same layout as AdminVerify profile view */}
      {profileModalUserId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeProfileModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProfileModal}
              className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {profileModalLoading ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md flex items-center justify-center min-h-[200px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : (
              <>
                <CaregiverProfileCard profile={profileModalData} />
                {/* Request Care button at the bottom of the modal */}
                {selectedCaregiver && (
                  <div className="bg-green-50 border border-t-0 border-gray-200 rounded-b-xl px-6 py-4 flex justify-end gap-2 -mt-px">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    {selectedCaregiver.has_active_booking ? (
                      <div className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                        Request Sent
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          closeProfileModal();
                          openBookingForm(selectedCaregiver);
                        }}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                      >
                        Request Care
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Booking form modal */}
      {showBookingForm && selectedCaregiver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl mx-4 my-8 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Request Care from {selectedCaregiver.username}
            </h3>

            <div className="space-y-4 mb-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Care Services Needed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Care Services Needed <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCaregiver.service_types && selectedCaregiver.service_types.length > 0 ? (
                    selectedCaregiver.service_types.map((service) => (
                      <label
                        key={service}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-green-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={bookingForm.service_types.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBookingForm((p) => ({
                                ...p,
                                service_types: [...p.service_types, service],
                              }));
                            } else {
                              setBookingForm((p) => ({
                                ...p,
                                service_types: p.service_types.filter((s) => s !== service),
                              }));
                            }
                          }}
                          className="accent-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{service}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-2">
                      No services available for this caregiver
                    </p>
                  )}
                </div>
              </div>

              {/* Person Requiring Care */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookingForm.person_name}
                    onChange={(e) =>
                      setBookingForm((p) => ({ ...p, person_name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={bookingForm.person_age}
                    onChange={(e) =>
                      setBookingForm((p) => ({ ...p, person_age: e.target.value }))
                    }
                    placeholder="Enter age"
                    min="1"
                    max="150"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Care Schedule & Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Care Schedule & Duration
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={bookingForm.date}
                      min={getMinDate()}
                      onChange={(e) =>
                        setBookingForm((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={bookingForm.start_time}
                      onChange={(e) =>
                        setBookingForm((p) => ({ ...p, start_time: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Duration (hours) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bookingForm.duration_hours}
                      onChange={(e) =>
                        setBookingForm((p) => ({
                          ...p,
                          duration_hours: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? "hour" : "hours"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={bookingForm.emergency_contact_phone}
                  onChange={(e) =>
                    setBookingForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))
                  }
                  placeholder="Enter phone number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Additional Care Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Care Information <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={bookingForm.additional_info}
                  onChange={(e) =>
                    setBookingForm((p) => ({ ...p, additional_info: e.target.value }))
                  }
                  rows={3}
                  placeholder="Any special requirements, medical conditions, or additional information the caregiver should know"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-600 mb-3">{message}</p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={closeBookingForm}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitBooking}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindCaregiver;
