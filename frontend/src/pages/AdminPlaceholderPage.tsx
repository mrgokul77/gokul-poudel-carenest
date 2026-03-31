type AdminPlaceholderPageProps = {
  title?: string;
};

const AdminPlaceholderPage = ({ title }: AdminPlaceholderPageProps) => {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <h1 className="text-xl font-semibold text-gray-700">
        {title ?? "Admin Page Coming Soon"}
      </h1>
    </div>
  );
};

export default AdminPlaceholderPage;
