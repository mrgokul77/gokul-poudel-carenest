import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Megaphone, Send } from "lucide-react";
import Navbar from "../components/Navbar";
import { adminApi } from "../api/axios";
import { extractApiError, UIErrorMessages } from "../utils/apiErrors";

const AUDIENCES = [
  { value: "all", label: "All Users" },
  { value: "caregivers", label: "Caregivers only" },
  { value: "careseekers", label: "Care seekers only" },
] as const;

const AdminSendAnnouncementPage = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [titleError, setTitleError] = useState("");
  const [messageError, setMessageError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError("");
    setMessageError("");

    if (!title.trim()) {
      setTitleError(UIErrorMessages.announcementTitleRequired);
      return;
    }
    if (!message.trim()) {
      setMessageError(UIErrorMessages.announcementMessageRequired);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await adminApi.post("announcements/", {
        title: title.trim(),
        message: message.trim(),
        target_audience: audience,
      });

      setSuccess("Announcement published successfully");
      setTitle("");
      setMessage("");
      setAudience("all");
    } catch (err) {
      const msg = extractApiError(err, "Something went wrong on our end. Please try again later.");
      if (msg.includes("title")) {
        setTitleError(UIErrorMessages.announcementTitleRequired);
      } else if (msg.includes("message")) {
        setMessageError(UIErrorMessages.announcementMessageRequired);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-xl mx-auto px-6 py-8">
        {/* Wireframe: back (left) → title + megaphone (right of title) */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center justify-center rounded-lg text-green-700 hover:bg-green-100 hover:text-green-800 p-1.5 -ml-1.5 shrink-0"
            aria-label="Back to admin dashboard"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-800 truncate">
              Send Announcements
            </h1>
            <Megaphone
              className="w-7 h-7 text-green-600 shrink-0"
              aria-hidden
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-4"
        >
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="ann-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              id="ann-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-green-50 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              maxLength={255}
            />
            {titleError ? <p className="text-red-600 text-xs mt-1">{titleError}</p> : null}
          </div>

          <div>
            <label
              htmlFor="ann-msg"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message
            </label>
            <textarea
              id="ann-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full min-h-[10rem] rounded-lg border border-gray-300 bg-green-50 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-y"
            />
            {messageError ? <p className="text-red-600 text-xs mt-1">{messageError}</p> : null}
          </div>

          <div>
            <label
              htmlFor="ann-aud"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Audience
            </label>
            <select
              id="ann-aud"
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as (typeof AUDIENCES)[number]["value"])
              }
              className="w-full rounded-lg border border-gray-300 bg-green-50 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60 shadow-sm"
            >
              <Send className="w-4 h-4" />
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSendAnnouncementPage;
