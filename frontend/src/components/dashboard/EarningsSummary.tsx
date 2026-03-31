interface EarningsSummaryProps {
  total_earnings: number;
  completed_count: number;
  average_per_booking: number;
}

const EarningsSummary = ({
  total_earnings,
  completed_count,
  average_per_booking,
}: EarningsSummaryProps) => {
  return (
    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">
        Earnings Summary
      </h2>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Total Earnings
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Rs {total_earnings.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Completed Services
          </p>
          <p className="text-lg font-semibold text-gray-800 mt-1">
            {completed_count} bookings
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Average Per Booking
          </p>
          <p className="text-lg font-semibold text-gray-800 mt-1">
            Rs {average_per_booking.toLocaleString("en-IN")} per booking
          </p>
        </div>
      </div>
    </div>
  );
};

export default EarningsSummary;
