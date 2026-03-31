import { Eye } from "lucide-react";
import UserAvatar from "./UserAvatar";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "careseeker" | "caregiver" | "admin";
  status: "active" | "inactive";
  profileImage?: string | null;
}

interface UserRowProps {
  user: User;
  onView: (user: User) => void;
}

const roleLabels: Record<string, string> = {
  careseeker: "Care Seeker",
  caregiver: "Caregiver",
  admin: "Admin",
};

const roleBadgeStyles: Record<string, string> = {
  caregiver: "bg-green-100 text-green-800",
  careseeker: "bg-gray-100 text-gray-800",
  admin: "bg-indigo-100 text-indigo-800",
};

const UserRow = ({ user, onView }: UserRowProps) => {
  return (
    <tr className="bg-green-50 hover:bg-green-100/80 transition-colors">
      <td className="px-4 py-3">
        <UserAvatar name={user.name} imageUrl={user.profileImage} size="sm" />
      </td>
      <td className="px-4 py-3 text-sm text-gray-800">{user.name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
            roleBadgeStyles[user.role] ?? "bg-gray-100 text-gray-800"
          }`}
        >
          {roleLabels[user.role] || user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
            user.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {user.status === "active" ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <button
            onClick={() => onView(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
