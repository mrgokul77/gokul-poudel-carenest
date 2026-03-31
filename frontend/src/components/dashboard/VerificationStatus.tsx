import { Clock, CheckCircle, XCircle } from "lucide-react";

interface VerificationStatusProps {
  status?: string | null;
}

const VerificationStatus = ({ status = "pending" }: VerificationStatusProps) => {
  let Icon = Clock;
  let badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
  let text = "Pending";
  let showReason = false;

  if (status === "approved") {
    Icon = CheckCircle;
    badgeClass = "bg-green-100 text-green-800 border-green-200";
    text = "Approved";
  } else if (status === "rejected" || !status) {
    Icon = XCircle;
    badgeClass = "bg-red-100 text-red-800 border-red-200";
    text = "Rejected";
    showReason = status === "rejected";
  }

  return (
    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <h3 className="text-sm font-bold text-gray-900">Verification Status</h3>
        {showReason && (
          <button className="text-[10px] text-red-600 hover:text-red-800 underline mt-0.5 font-medium text-left w-fit transition-colors">
            View Reason
          </button>
        )}
      </div>
      <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${badgeClass}`}>
        <Icon className="w-3.5 h-3.5" />
        {text}
      </span>
    </div>
  );
};

export default VerificationStatus;
