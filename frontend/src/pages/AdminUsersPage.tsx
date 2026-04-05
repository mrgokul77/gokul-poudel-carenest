import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import FilterSidebar from "../components/admin/FilterSidebar";
import UsersTable from "../components/admin/UsersTable";
import UserDetailsModal from "../components/admin/UserDetailsModal";
import type { User } from "../components/admin/UsersTable";
import { Search, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { adminApi } from "../api/axios";

const API_BASE = "http://localhost:8000";

/** Resolve profile_image to full URL (backend may return relative path) */
const resolveProfileImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

/** Map API user to frontend User shape */
const mapApiUserToUser = (u: {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  profile_image?: string | null;
}): User => ({
  id: u.id,
  name: u.username,
  email: u.email,
  role: u.role as User["role"],
  status: u.is_active ? "active" : "inactive",
  profileImage: resolveProfileImageUrl(u.profile_image) ?? null,
});

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get("/users/");
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? res.data;
      setUsers(data.map(mapApiUserToUser));
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string }; status?: number } }).response?.data
              ?.detail ?? "Failed to load users"
          : "Failed to load users";
      setError(String(message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterRole("all");
    setCurrentPage(1);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filterStatus !== "all" && user.status !== filterStatus) return false;
      if (filterRole !== "all" && user.role !== filterRole) return false;
      return true;
    });
  }, [users, filterStatus, filterRole]);

  const searchedUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return filteredUsers;
    return filteredUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    );
  }, [filteredUsers, searchQuery]);

  const totalPages = Math.ceil(searchedUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(
    () =>
      searchedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [searchedUsers, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterRole, searchQuery]);

  const handleView = (user: User) => {
    setSelectedUserId(user.id);
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
  };

  const handleSave = async (
    user: User,
    updates: { role: User["role"]; status: User["status"] }
  ) => {
    setSaving(true);
    try {
      await adminApi.patch(`/users/${user.id}/`, {
        role: updates.role,
        is_active: updates.status === "active",
      });
      await fetchUsers();
      setSuccessMessage("User updated successfully");
      setTimeout(() => setSuccessMessage(null), 4000);
      handleCloseModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
            "Failed to update user"
          : "Failed to update user";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await adminApi.patch(`/users/${user.id}/`, {
        is_active: user.status !== "active",
      });
      await fetchUsers();
      if (selectedUserId === user.id) setSelectedUserId(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
            "Failed to update status"
          : "Failed to update status";
      alert(msg);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`))
      return;
    try {
      await adminApi.delete(`/users/${user.id}/`);
      await fetchUsers();
      handleCloseModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
            "Failed to delete user"
          : "Failed to delete user";
      alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {successMessage && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
            <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <FilterSidebar
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterRole={filterRole}
            setFilterRole={setFilterRole}
            onReset={resetFilters}
          />

          <div className="lg:col-span-9 order-1 lg:order-2">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Manage Users
            </h2>

            <div className="relative w-full mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-base"
              />
            </div>

            {loading ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading users...</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
                <p className="text-gray-500">
                  {error ? "Could not load users." : "No users found."}
                </p>
              </div>
            ) : (
              <UsersTable users={paginatedUsers} onView={handleView} />
            )}

            {!loading && searchedUsers.length > 0 && (
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
                  Page {currentPage} of {totalPages}
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
          </div>
        </div>
      </div>

      <UserDetailsModal
        user={selectedUser}
        isOpen={selectedUserId !== null}
        onClose={handleCloseModal}
        onSave={handleSave}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  );
};

export default AdminUsersPage;
