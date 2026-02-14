import { Check } from "lucide-react";

interface VerifiedAvatarProps {
  src?: string | null;
  username: string;
  isVerified?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  onImageError?: () => void;
  className?: string;
}


const VerifiedAvatar = ({
  src,
  username,
  isVerified = false,
  size = "lg",
  onClick,
  onImageError,
  className = "",
}: VerifiedAvatarProps) => {
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: {
      container: "w-16 h-16",
      text: "text-xl",
      tick: "w-5 h-5",
      tickIconSize: 12,
    },
    md: {
      container: "w-20 h-20",
      text: "text-2xl",
      tick: "w-5 h-5",
      tickIconSize: 12,
    },
    lg: {
      container: "w-24 h-24",
      text: "text-2xl",
      tick: "w-6 h-6",
      tickIconSize: 14,
    },
  };

  const s = sizeClasses[size];

  // Image classes match Profile page: rounded-full border-4 border-white shadow-md object-cover
  const imgClasses = `${s.container} rounded-full border-4 border-white shadow-md object-cover bg-green-100`;

  // Fallback (initials) when no image
  const fallback = (
    <div
      className={`${s.container} rounded-full border-4 border-white shadow-md bg-green-100 flex items-center justify-center`}
    >
      <span className={`${s.text} font-semibold text-green-700`}>
        {getInitial(username)}
      </span>
    </div>
  );

  // Tick position: bottom-1 right-1 (same as Profile page for both sizes)
  const tickPosition = "bottom-1 right-1";

  // Avatar wrapper - dedicated container with position: relative
  const avatarWrapper = (
    <div className={`relative shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={username}
          className={imgClasses}
          onError={onImageError}
        />
      ) : (
        fallback
      )}
      {/* Green verified tick - positioned at bottom-right of avatar (same as Profile page) */}
      {isVerified && (
        <div
          className={`absolute ${tickPosition} ${s.tick} bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white`}
        >
          <Check size={s.tickIconSize} className="text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );

  // If onClick is provided, wrap the entire avatar wrapper in a button
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full p-0 border-0 bg-transparent"
        title="View profile"
      >
        {avatarWrapper}
      </button>
    );
  }

  return avatarWrapper;
};

export default VerifiedAvatar;
