import { Calendar, Clock, CheckCircle, Wallet } from "lucide-react";

interface SummaryCardsProps {
  pending_requests: number;
  upcoming_bookings: number;
  completed_services: number;
  total_earnings: number;
}

const SummaryCards = ({
  pending_requests,
  upcoming_bookings,
  completed_services,
  total_earnings,
}: SummaryCardsProps) => {
  const cards = [
    {
      label: "Pending Requests",
      value: pending_requests,
      icon: Calendar,
      color: "text-yellow-600",
    },
    {
      label: "Upcoming Bookings",
      value: upcoming_bookings,
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Completed Services",
      value: completed_services,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Total Earnings",
      value: `Rs ${total_earnings.toLocaleString("en-IN")}`,
      icon: Wallet,
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center ${card.color}`}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-600">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
