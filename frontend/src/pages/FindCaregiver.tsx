import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import CaregiverProfileCard from "../components/CaregiverProfileCard";
import type { CaregiverProfileCardData } from "../components/CaregiverProfileCard";
import VerifiedAvatar from "../components/VerifiedAvatar";
import api, { bookingsApi, chatApi } from "../api/axios";
import {
  fetchNepalAddressSuggestions,
  NEPAL_EMPTY_MESSAGE,
  type NominatimSearchHit,
} from "../utils/nominatimSearch";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Heart,
  Languages,
} from "lucide-react";

interface Caregiver {
  user_id: number;
  username: string;
  email: string;
  service_types: string[];
  languages_spoken?: string[];
  training_authority?: string;
  certification_year?: number | null;
  available_hours: string;
  profile_image?: string | null;
  bio?: string | null;
  gender?: string | null;
  hourly_rate?: number | null;
  verification_status?: string;
  address?: string | null;
  location?: string | null;
  has_active_booking?: boolean;
  average_rating?: number | null;
  review_count?: number;
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
  service_address: string;
  /** Set when user picks a location on the map */
  latitude: number | null;
  longitude: number | null;
  additional_info: string;
}

// Keep in sync with Profile.tsx SERVICE_TYPES
const SERVICE_TYPES = [
  "Elderly Companionship",
  "Daily Living Assistance",
  "Medication Reminders",
  "Light Household Help",
  "Hospital & Clinic Escort",
  "Physiotherapy Support",
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch bookings for the current careseeker
  const fetchBookings = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await bookingsApi.get("list/");
      setBookings(res.data);
    } catch {
      setBookings([]);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterModalService, setFilterModalService] = useState("");
  const [filterModalLocation, setFilterModalLocation] = useState("");
  const [filterModalGender, setFilterModalGender] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingPrefillConsumed, setBookingPrefillConsumed] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(
    null,
  );
  const [profileModalUserId, setProfileModalUserId] = useState<number | null>(
    null,
  );
  const [profileModalData, setProfileModalData] =
    useState<CaregiverProfileCardData | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [_profileModalError, _setProfileModalError] = useState<string | null>(
    null,
  );
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteMessage, setFavouriteMessage] = useState("");
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    service_types: [],
    person_name: "",
    person_age: "",
    date: "",
    start_time: "",
    duration_hours: 2,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    service_address: "",
    latitude: null,
    longitude: null,
    additional_info: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{ is_available?: boolean; message?: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<NominatimSearchHit[]>(
    [],
  );
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [addressSearchNoResults, setAddressSearchNoResults] = useState(false);
  const [addressFieldFocused, setAddressFieldFocused] = useState(false);
  const addressSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressSearchQueryRef = useRef("");

  const runAddressSearch = useCallback(async (q: string) => {
    addressSearchQueryRef.current = q;
    if (q.trim().length < 2) {
      setAddressSuggestions([]);
      setAddressSearchNoResults(false);
      setAddressSuggestLoading(false);
      return;
    }
    setAddressSuggestLoading(true);
    setAddressSearchNoResults(false);
    try {
      const results = await fetchNepalAddressSuggestions(q);
      if (addressSearchQueryRef.current === q) {
        setAddressSuggestions(results);
        setAddressSearchNoResults(results.length === 0);
      }
    } catch {
      if (addressSearchQueryRef.current === q) {
        setAddressSuggestions([]);
        setAddressSearchNoResults(true);
      }
    } finally {
      if (addressSearchQueryRef.current === q) {
        setAddressSuggestLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!showBookingForm) return;
    const q = bookingForm.service_address;
    if (addressSearchTimer.current) clearTimeout(addressSearchTimer.current);
    addressSearchTimer.current = setTimeout(() => {
      runAddressSearch(q);
    }, 400);
    return () => {
      if (addressSearchTimer.current) clearTimeout(addressSearchTimer.current);
    };
  }, [bookingForm.service_address, showBookingForm, runAddressSearch]);

  const selectAddressSuggestion = (hit: NominatimSearchHit) => {
    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    setBookingForm((p) => ({
      ...p,
      service_address: hit.display_name,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
    }));
    setAddressSuggestions([]);
    setAddressSearchNoResults(false);
  };

  const highlightMatch = (text: string, query: string) => {
    const q = query.trim();
    if (!q) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-100 text-inherit px-0">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  useEffect(() => {
    fetchCaregivers();
  }, [filterLocation, filterGender, languageQuery]);

  const fetchCaregivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.append("location", filterLocation);
      if (filterGender && filterGender !== "")
        params.append("gender", filterGender);
      if (languageQuery.trim()) params.append("language", languageQuery.trim());

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

  // Helper: check if careseeker has active booking with caregiver
  const hasActiveBooking = (caregiverId: number) => {
    return bookings.some(
      (b) =>
        b.caregiver === caregiverId &&
        ["pending", "accepted", "completion_requested", "awaiting_confirmation"].includes(
          b.booking_status || b.status,
        ),
    );
  };

  const filtered = caregivers.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.service_types &&
        c.service_types.some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase()),
        ));
    const matchService =
      !filterService ||
      (c.service_types && c.service_types.includes(filterService));
    const matchLanguage =
      !languageQuery ||
      (c.languages_spoken &&
        c.languages_spoken.some((language) =>
          language.toLowerCase().includes(languageQuery.toLowerCase()),
        ));
    return matchSearch && matchService && matchLanguage;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCaregivers = filtered.slice(indexOfFirst, indexOfLast);

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
      service_address: "",
      latitude: null,
      longitude: null,
      additional_info: "",
    });
    setError("");
    setDateError("");
    setTimeError("");
    setBookingError("");
    setMessage("");
    setAddressSuggestions([]);
    setAddressSearchNoResults(false);
    setAddressFieldFocused(false);
    setShowBookingForm(true);
  };

  useEffect(() => {
    const requestedId = location.state?.openBookingForId as number | undefined;
    if (!requestedId || bookingPrefillConsumed || showBookingForm) {
      return;
    }

    const requestedCaregiver = caregivers.find(
      (caregiver) => caregiver.user_id === requestedId,
    );

    if (requestedCaregiver) {
      openBookingForm(requestedCaregiver);
      setBookingPrefillConsumed(true);
    }
  }, [caregivers, bookingPrefillConsumed, location.state, showBookingForm]);

  const closeBookingForm = () => {
    setShowBookingForm(false);
    setSelectedCaregiver(null);
    setAddressSuggestions([]);
    setAddressSearchNoResults(false);
    setAddressFieldFocused(false);
  };

  const openProfileModal = async (c: Caregiver) => {
    setSelectedCaregiver(c);
    setProfileModalUserId(c.user_id);
    setProfileModalData(null);
    setProfileModalLoading(true);
    try {
      const res = await api.get(`admin/profile/${c.user_id}/`);
      console.log("[FindCaregiver] Profile modal data:", res.data); // TEMP: verify caregiver fields
      setProfileModalData(res.data);
    } catch {
      setProfileModalData({
        username: c.username,
        email: c.email,
        role: "caregiver",
        verification_status: "approved",
        caregiver_details: {
          service_types: c.service_types,
          languages_spoken: c.languages_spoken,
          training_authority: c.training_authority,
          certification_year: c.certification_year,
          available_hours: c.available_hours,
          bio: c.bio || undefined,
          gender: c.gender || undefined,
          hourly_rate: c.hourly_rate ?? undefined,
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
    setIsFavourite(false);
    setFavouriteMessage("");
  };

  useEffect(() => {
    if (!profileModalUserId || !selectedCaregiver) {
      setIsFavourite(false);
      return;
    }

    const saved = JSON.parse(
      localStorage.getItem("favourite_caregivers") || "[]",
    ) as Array<{ id: number }>;
    const exists = saved.some((f) => f.id === selectedCaregiver.user_id);
    setIsFavourite(exists);
  }, [profileModalUserId, selectedCaregiver]);

  const toggleFavourite = (caregiver: Caregiver) => {
    const saved = JSON.parse(
      localStorage.getItem("favourite_caregivers") || "[]",
    ) as Array<{
      id: number;
      name?: string;
      profile_photo?: string | null;
      rating?: number | null;
      service_type?: string[];
    }>;

    const alreadyFavourite = saved.some((f) => f.id === caregiver.user_id);

    if (alreadyFavourite) {
      const updated = saved.filter((f) => f.id !== caregiver.user_id);
      localStorage.setItem("favourite_caregivers", JSON.stringify(updated));
      setIsFavourite(false);
      setFavouriteMessage("Removed from favourites");
      return;
    }

    const updated = [
      ...saved,
      {
        id: caregiver.user_id,
        name: caregiver.username,
        profile_photo: caregiver.profile_image,
        rating: caregiver.average_rating,
        service_types: caregiver.service_types ?? [],
        service_type: caregiver.service_types ?? [],
        location: caregiver.address ?? caregiver.location ?? null,
        hourly_rate: caregiver.hourly_rate ?? null,
        total_reviews: caregiver.review_count ?? 0,
      },
    ];

    localStorage.setItem("favourite_caregivers", JSON.stringify(updated));
    setIsFavourite(true);
    setFavouriteMessage("Added to My Favourites ❤️");
  };

  const isCaregiverFavourite = (caregiverId: number) => {
    const saved = JSON.parse(
      localStorage.getItem("favourite_caregivers") || "[]",
    ) as Array<{ id: number }>;
    return saved.some((f) => f.id === caregiverId);
  };

  const submitBooking = async () => {
    if (!selectedCaregiver) return;

    const isFormEmpty =
    bookingForm.service_types.length === 0 &&
    !bookingForm.person_name &&
    !bookingForm.person_age &&
    !bookingForm.date &&
    !bookingForm.start_time &&
    !bookingForm.emergency_contact_phone &&
    !bookingForm.service_address &&
    !bookingForm.additional_info;

  if (isFormEmpty) {
    setError("Please fill in the required details before submitting your booking request.");
    return;
  }

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

    if (!availableSlots.some((s) => s.value === bookingForm.start_time)) {
      setTimeError("Please select a valid time slot");
      return;
    }

    if (!validateDateTime()) {
      return;
    }

    // Emergency phone validation: exactly 10 digits, numeric only
    const phone = bookingForm.emergency_contact_phone.trim();
    if (!/^[0-9]{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    setSubmitting(true);
    setError("");
    setBookingError("");
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        caregiver: selectedCaregiver.user_id,
        service_types: bookingForm.service_types,
        person_name: bookingForm.person_name,
        person_age: parseInt(bookingForm.person_age),
        date: bookingForm.date,
        start_time: bookingForm.start_time,
        duration_hours: bookingForm.duration_hours,
        emergency_contact_phone: bookingForm.emergency_contact_phone.trim(),
        service_address: bookingForm.service_address.trim() || undefined,
        additional_info: bookingForm.additional_info.trim() || undefined,
      };
      if (
        bookingForm.latitude != null &&
        bookingForm.longitude != null &&
        Number.isFinite(bookingForm.latitude) &&
        Number.isFinite(bookingForm.longitude)
      ) {
        body.latitude = bookingForm.latitude;
        body.longitude = bookingForm.longitude;
      }
      if (import.meta.env.DEV) {
        console.log("FINAL PAYLOAD:", body);
        console.log("LOCATION STATE:", {
          address: bookingForm.service_address,
          latitude: bookingForm.latitude,
          longitude: bookingForm.longitude,
        });
      }
      await bookingsApi.post("", body);
      setMessage("Booking request sent successfully");
      // Refresh bookings so the Request Care button updates to Request Sent
      await fetchBookings();
      setTimeout(() => {
        closeBookingForm();
      }, 1500);
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          data?: {
            error?: string;
            detail?: string;
            date?: string[];
            start_time?: string[];
          };
        };
      };
      const errorMsg =
        ax.response?.data?.error ||
        ax.response?.data?.detail ||
        "Booking failed";

      if (errorMsg.includes("already have an active booking")) {
        setError(
          "You have already requested this caregiver. Please wait for response.",
        );
      } else if (errorMsg.includes("at least 1 hour in advance")) {
        setBookingError(errorMsg);
      } else if (ax.response?.data?.date) {
        setDateError(ax.response.data.date[0] || "Invalid date");
      } else if (ax.response?.data?.start_time) {
        setTimeError(ax.response.data.start_time[0] || "Invalid time");
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkAvailability = useCallback(
    async (
      caregiverId?: number | null,
      date?: string,
      startTime?: string,
      duration?: number,
    ) => {
      if (!caregiverId || !date || !startTime || !duration) {
        setAvailabilityStatus(null);
        return;
      }

      setCheckingAvailability(true);
      setAvailabilityStatus(null);

      try {
        const response = await bookingsApi.get("check-availability/", {
          params: {
            caregiver_id: caregiverId,
            date,
            start_time: startTime,
            duration_hours: duration,
          },
        });
        setAvailabilityStatus(response.data);
      } catch {
        setAvailabilityStatus(null);
      } finally {
        setCheckingAvailability(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedCaregiver?.user_id || !bookingForm.date || !bookingForm.start_time || !bookingForm.duration_hours) {
      setAvailabilityStatus(null);
      return;
    }

    const timer = window.setTimeout(() => {
      checkAvailability(
        selectedCaregiver.user_id,
        bookingForm.date,
        bookingForm.start_time,
        bookingForm.duration_hours,
      );
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    selectedCaregiver?.user_id,
    bookingForm.date,
    bookingForm.start_time,
    bookingForm.duration_hours,
    checkAvailability,
  ]);

  const getMinDate = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  /** Hourly slots 08:00–20:00. For today, only slots >= current hour + 1 hour. */
  const getAvailableTimeSlots = (date?: string): { value: string; label: string }[] => {
    const allSlots: { value: string; label: string }[] = [];
    for (let h = 8; h <= 20; h++) {
      const value = `${String(h).padStart(2, "0")}:00`;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      allSlots.push({ value, label: `${hour12}:00 ${ampm}` });
    }

    const checkDate = date ?? bookingForm.date;
    if (!checkDate || checkDate !== getMinDate()) {
      return allSlots;
    }

    const now = new Date();
    const nextSlot = new Date(now);
    nextSlot.setMinutes(0, 0, 0);
    nextSlot.setHours(nextSlot.getHours() + 1);

    const minHour = nextSlot.getHours();
    const minMinutes = nextSlot.getMinutes();
    const minSlotValue = `${String(minHour).padStart(2, "0")}:${String(minMinutes).padStart(2, "0")}`;

    return allSlots.filter((s) => s.value >= minSlotValue);
  };

  const availableSlots = getAvailableTimeSlots();

  const validateDateTime = () => {
    setDateError("");
    setTimeError("");
    if (!bookingForm.date) return true;

    const selectedDate = new Date(bookingForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setDateError("You cannot select a past date.");
      return false;
    }
    return true;
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
                  <span>
                    Review caregiver profiles and bio via profile images
                  </span>
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
                  <span>
                    Clearly mention requirements when requesting a booking
                  </span>
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
              <div className="mt-3 relative">
                <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by language spoken"
                  value={languageQuery}
                  onChange={(e) => setLanguageQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                />
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
                No verified caregivers match your filters. Try changing the
                search or filters.
              </div>
            ) : (
              <>
                <ul className="space-y-5">
                  {currentCaregivers.map((c) => {
                    const active = hasActiveBooking(c.user_id);
                    const button = active ? (
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
                    );
                    return (
                      <li
                        key={c.user_id}
                        className="relative bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-500 transition-colors cursor-pointer"
                        onClick={() => openProfileModal(c)}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(c);
                          }}
                          className={`absolute top-3 right-3 p-1.5 rounded-full transition-all ${
                            isCaregiverFavourite(c.user_id)
                              ? "text-red-500"
                              : "text-gray-300 hover:text-red-400"
                          }`}
                          aria-label="Toggle favourite"
                        >
                          <Heart
                            size={18}
                            className={isCaregiverFavourite(c.user_id) ? "fill-red-500" : ""}
                          />
                        </button>
                        <div className="flex gap-4 items-center">
                          {/* Profile photo with verified tick */}
                          <VerifiedAvatar
                            src={
                              c.profile_image && !imageErrors[c.user_id]
                                ? c.profile_image
                                : null
                            }
                            username={c.username}
                            isVerified={c.verification_status === "approved"}
                            size="md"
                            onClick={() => openProfileModal(c)}
                            onImageError={() =>
                              setImageErrors((prev) => ({
                                ...prev,
                                [c.user_id]: true,
                              }))
                            }
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h2 className="font-semibold text-gray-800">
                                {c.username}
                              </h2>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <span className="text-yellow-500">★</span>
                                {/* Show average rating and review count, or 'New (0 reviews)' if none */}
                                {typeof c.review_count === "number" && c.review_count > 0 && typeof c.average_rating === "number" ? (
                                  <span className="font-semibold">{c.average_rating.toFixed(1)} ({c.review_count} reviews)</span>
                                ) : (
                                  <span className="text-gray-400">New (0 reviews)</span>
                                )}
                              </div>
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
                                <MapPin
                                  size={14}
                                  className="text-gray-500 shrink-0"
                                />
                                <span className="text-xs text-gray-500">
                                  {c.address}
                                </span>
                              </div>
                            )}

                            {/* Hourly Rate */}
                            {c.hourly_rate && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2.5 py-1 text-sm font-semibold text-green-700 bg-green-100 border border-green-200 rounded-lg">
                                  Rs. {c.hourly_rate} / hour
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {button}
                            <button
                              type="button"
                              className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                              aria-label="Open chat"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await chatApi.post<{ conversation_id: number }>("start/", {
                                    caregiver_id: c.user_id,
                                  });
                                  navigate(`/messages/${res.data.conversation_id}`);
                                } catch {
                                  navigate("/messages");
                                }
                              }}
                            >
                              <MessageCircle
                                size={20}
                                className="stroke-current"
                              />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!loading && currentCaregivers.length > 0 && (
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
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
                  setLanguageQuery("");
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
            {selectedCaregiver && (
              <button
                type="button"
                onClick={() => toggleFavourite(selectedCaregiver)}
                className={`absolute top-3 right-12 p-2 rounded-full transition-all ${
                  isFavourite
                    ? "text-red-500 bg-red-50"
                    : "text-gray-400 bg-gray-100 hover:bg-red-50 hover:text-red-400"
                }`}
                title={isFavourite ? "Remove from favourites" : "Add to favourites"}
              >
                <Heart size={20} className={isFavourite ? "fill-red-500" : ""} />
              </button>
            )}
            {profileModalLoading ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md flex items-center justify-center min-h-[200px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : (
              <>
                <CaregiverProfileCard profile={profileModalData} />
                {favouriteMessage && (
                  <div className="bg-green-50 border border-gray-200 border-t-0 px-6 py-3 text-sm text-gray-700">
                    {favouriteMessage}
                  </div>
                )}
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
                    {selectedCaregiver &&
                    hasActiveBooking(selectedCaregiver.user_id) ? (
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
        <>
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-green-50 p-6 rounded-xl w-full max-w-3xl mx-4 my-8 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Fill in the details below to send a booking request
            </h3>

            <div className="space-y-4 mb-4 max-h-[70vh] overflow-y-auto px-2">
              {/* Care Services Needed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Care Services Needed <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCaregiver.service_types &&
                  selectedCaregiver.service_types.length > 0 ? (
                    selectedCaregiver.service_types.map((service) => (
                      <label
                        key={service}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
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
                                service_types: p.service_types.filter(
                                  (s) => s !== service,
                                ),
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
                      setBookingForm((p) => ({
                        ...p,
                        person_name: e.target.value,
                      }))
                    }
                    className="w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500"
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
                      setBookingForm((p) => ({
                        ...p,
                        person_age: e.target.value,
                      }))
                    }
                    placeholder="Enter age"
                    min="1"
                    max="150"
                    className="w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500"
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
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setBookingForm((p) => {
                          const next = { ...p, date: newDate };
                          if (newDate === getMinDate()) {
                            const slots = getAvailableTimeSlots(newDate);
                            if (
                              p.start_time &&
                              !slots.some((s) => s.value === p.start_time)
                            ) {
                              next.start_time = "";
                            }
                          }
                          return next;
                        });
                        setDateError("");
                        setBookingError("");
                      }}
                      className={`w-full box-border bg-green-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500 ${
                        dateError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {dateError && (
                      <p className="text-xs text-red-600 mt-1">{dateError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={
                        availableSlots.some((s) => s.value === bookingForm.start_time)
                          ? bookingForm.start_time
                          : ""
                      }
                      onChange={(e) => {
                        setBookingForm((p) => ({
                          ...p,
                          start_time: e.target.value,
                        }));
                        setTimeError("");
                        setBookingError("");
                      }}
                      className={`w-full box-border bg-green-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500 ${
                        timeError ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select time</option>
                      {availableSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    {availableSlots.length === 0 && bookingForm.date === getMinDate() && (
                      <p className="text-xs text-gray-500 mt-1">
                        No slots available today. Please select a future date.
                      </p>
                    )}
                    {timeError && (
                      <p className="text-xs text-red-600 mt-1">{timeError}</p>
                    )}
                    {bookingError && (
                      <p className="text-xs text-red-600 mt-1">{bookingError}</p>
                    )}
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
                      className="w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? "hour" : "hours"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {checkingAvailability ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    Checking caregiver availability...
                  </div>
                ) : availabilityStatus?.is_available ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mt-2 border border-green-200">
                    <span>✓</span>
                    Caregiver is available at this time
                  </div>
                ) : availabilityStatus?.is_available === false ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-2 border border-red-200">
                    <span>⚠</span>
                    {availabilityStatus?.message ??
                      "Caregiver is not available at this time. Please choose a different time slot."}
                  </div>
                ) : null}
              </div>

              {/* Emergency Contact Details & Service Address */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Service Address <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full min-w-0">
                      <textarea
                        value={bookingForm.service_address}
                        onChange={(e) =>
                          setBookingForm((p) => ({
                            ...p,
                            service_address: e.target.value,
                          }))
                        }
                        onFocus={() => setAddressFieldFocused(true)}
                        onBlur={() => {
                          setTimeout(() => setAddressFieldFocused(false), 200);
                        }}
                        rows={2}
                        placeholder="Type an address and pick from suggestions"
                        className="min-h-[48px] w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500 resize-y"
                      />
                      {addressFieldFocused &&
                        bookingForm.service_address.trim().length >= 2 && (
                          <div
                            className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-300 bg-green-50 shadow-sm max-h-56 overflow-y-auto text-sm"
                            role="listbox"
                          >
                            {addressSuggestLoading && (
                              <div className="px-3 py-2 text-gray-600">Searching…</div>
                            )}
                            {!addressSuggestLoading &&
                              addressSuggestions.map((hit) => (
                                <button
                                  key={hit.place_id}
                                  type="button"
                                  role="option"
                                  className="w-full text-left px-3 py-2 hover:bg-green-100/80 border-b border-gray-100 last:border-0 text-gray-800"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectAddressSuggestion(hit)}
                                >
                                  {highlightMatch(
                                    hit.display_name,
                                    bookingForm.service_address,
                                  )}
                                </button>
                              ))}
                            {!addressSuggestLoading &&
                              addressSuggestions.length === 0 &&
                              addressSearchNoResults && (
                                <div className="px-3 py-2 text-gray-600">
                                  {NEPAL_EMPTY_MESSAGE}
                                </div>
                              )}
                          </div>
                        )}
                    </div>
                    {bookingForm.latitude != null &&
                      bookingForm.longitude != null && (
                        <p className="text-xs text-green-600 font-medium">
                          Location selected ✓
                        </p>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Emergency Phone Number{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={bookingForm.emergency_contact_phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setBookingForm((p) => ({
                        ...p,
                        emergency_contact_phone: value.slice(0, 10),
                      }));
                    }}
                    placeholder="Enter emergency phone number"
                    className="w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-3 h-[48px] text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Additional Care Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Care Information{" "}
                  <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={bookingForm.additional_info}
                  onChange={(e) =>
                    setBookingForm((p) => ({
                      ...p,
                      additional_info: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Any special requirements, medical conditions, or additional information the caregiver should know"
                  className="w-full box-border bg-green-50 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 focus:border-green-500"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
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
                disabled={submitting || checkingAvailability || availabilityStatus?.is_available === false}
                className={`px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium ${
                  availabilityStatus?.is_available === false ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {submitting
                  ? "Submitting..."
                  : availabilityStatus?.is_available === false
                    ? "Caregiver Unavailable"
                    : "Submit Request"}
              </button>
            </div>
          </div>
        </div>

        </>
      )}
    </div>
  );
};

export default FindCaregiver;
