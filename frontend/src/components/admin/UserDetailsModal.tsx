import { useState, useEffect } from "react";
import { X, Pencil, Power, Trash2, Shield } from "lucide-react";
import type { User } from "./UserRow";
import UserAvatar from "./UserAvatar";

const roleLabels: Record<string, string> = {
  careseeker: "Care Seeker",
  caregiver: "Caregiver",
  admin: "Admin",
};

/** Editable roles only - no Admin */
const EDITABLE_ROLE_OPTIONS: { value: "careseeker" | "caregiver"; label: string }[] = [
  { value: "careseeker", label: "Care Seeker" },
  { value: "caregiver", label: "Caregiver" },
];

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User, updates: { role: User["role"]; status: User["status"] }) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
  saving?: boolean;
}

const UserDetailsModal = ({
  user,
  isOpen,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
  saving = false,
}: UserDetailsModalProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRole, setEditRole] = useState<"careseeker" | "caregiver">("careseeker");
  const [editStatus, setEditStatus] = useState<User["status"]>("active");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user) {
      const role = user.role === "admin" ? "careseeker" : user.role;
      setEditRole(role as "careseeker" | "caregiver");
      setEditStatus(user.status);
      setIsEditMode(false);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = () => {
    onSave(user, { role: editRole, status: editStatus });
  };

  const handleCancel = () => {
    const role = user.role === "admin" ? "careseeker" : user.role;
    setEditRole(role as "careseeker" | "caregiver");
    setEditStatus(user.status);
    setIsEditMode(false);
  };

  const handleToggleStatus = () => {
    onToggleStatus(user);
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      )
    )
      return;
    onDelete(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 animate-modal-in"
        role="dialog"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-2">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-800">
            User Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar - centered at top */}
        <div className="flex justify-center pb-4">
          <UserAvatar
            name={user.name}
            imageUrl={user.profileImage}
            size="lg"
          />
        </div>

        {/* Body - Info Section */}
        <div className="px-8 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Name</label>
            <p className="text-gray-800 font-medium">{user.name}</p>
          </div>

          {/* Email - readonly */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="text"
              value={user.email}
              readOnly
              className="w-full px-3 py-2.5 text-gray-800 font-medium bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Role</label>
            {isEditMode && !isAdmin ? (
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "careseeker" | "caregiver")}
                className="w-full px-3 py-2.5 text-gray-800 font-medium border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                {EDITABLE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : isEditMode && isAdmin ? (
              <input
                type="text"
                value={roleLabels[user.role] || user.role}
                disabled
                className="w-full px-3 py-2.5 text-gray-600 font-medium bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
              />
            ) : (
              <p className="text-gray-800 font-medium">
                {roleLabels[user.role] || user.role}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Status</label>
            {isEditMode && !isAdmin ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editStatus === "active"}
                  onClick={() => setEditStatus(editStatus === "active" ? "inactive" : "active")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    editStatus === "active" ? "bg-green-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      editStatus === "active" ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {editStatus === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            ) : isEditMode && isAdmin ? (
              <input
                type="text"
                value={user.status === "active" ? "Active" : "Inactive"}
                disabled
                className="w-full px-3 py-2.5 text-gray-600 font-medium bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed max-w-[120px]"
              />
            ) : (
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                  user.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {user.status === "active" ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          {/* Admin restriction message */}
          {isEditMode && isAdmin && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Admin accounts cannot be modified.
              </p>
            </div>
          )}
        </div>

        {/* Divider before primary action */}
        <div className="border-t border-gray-200 mx-8" />

        {/* Primary Action - Edit or Save/Cancel */}
        <div className="px-8 py-4">
          {isEditMode ? (
            <div className="flex gap-3">
              {!isAdmin && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
              <button
                onClick={handleCancel}
                disabled={saving}
                className={`py-2.5 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isAdmin ? "w-full" : "flex-1"
                }`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {/* Divider before action section */}
        <div className="border-t border-gray-200 mx-8" />

        {/* Action Section */}
        <div className="px-8 py-4 space-y-3">
          {isAdmin ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Admin accounts are protected and cannot be deactivated or deleted.
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleToggleStatus}
                disabled={saving}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  user.status === "active"
                    ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <Power className="w-4 h-4" />
                {user.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
