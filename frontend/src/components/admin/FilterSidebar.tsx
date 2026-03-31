interface FilterSidebarProps {
  filterStatus: "all" | "active" | "inactive";
  setFilterStatus: (v: "all" | "active" | "inactive") => void;
  filterRole: string;
  setFilterRole: (v: string) => void;
  onReset: () => void;
}

const FilterSidebar = ({
  filterStatus,
  setFilterStatus,
  filterRole,
  setFilterRole,
  onReset,
}: FilterSidebarProps) => {
  return (
    <div className="lg:col-span-3 order-2 lg:order-1 hidden md:block">
      <div className="space-y-4 sticky top-6">
        {/* Filter Header */}
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter Users
          </h3>
        </div>

        {/* User Status Filter Card */}
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              User Status
            </span>
          </div>
          <div className="space-y-2 px-1">
            {[
              { value: "all" as const, label: "All" },
              { value: "active" as const, label: "Active" },
              { value: "inactive" as const, label: "Inactive" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="radio"
                  name="filterStatus"
                  value={option.value}
                  checked={filterStatus === option.value}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as "all" | "active" | "inactive")
                  }
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Role Filter Card */}
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Role
            </span>
          </div>
          <div className="space-y-2 px-1">
            {[
              { value: "all", label: "All" },
              { value: "careseeker", label: "Care Seeker" },
              { value: "caregiver", label: "Caregiver" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="radio"
                  name="filterRole"
                  value={option.value}
                  checked={filterRole === option.value}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Reset Button Card */}
        <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
          <button
            onClick={onReset}
            className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-sm transition-all duration-200 hover:from-green-700 hover:to-green-600 hover:shadow-md active:scale-[0.98]"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
