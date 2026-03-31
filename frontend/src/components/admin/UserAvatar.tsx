import { useState } from "react";

export type UserAvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16 text-lg",
};

interface UserAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

const UserAvatar = ({
  name,
  imageUrl,
  size = "sm",
  className = "",
}: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const showImage = imageUrl && !imageError;

  const sizeClass = sizeClasses[size];
  const baseClasses =
    "inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 text-gray-700 font-semibold ring-2 ring-white shadow-sm transition-transform hover:scale-105 hover:shadow-md";

  return (
    <div
      className={`${sizeClass} ${baseClasses} ${className}`}
      title={name}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="select-none">
          {name.charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
