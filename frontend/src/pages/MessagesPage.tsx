/**
 * Messages page: Single-panel conversation list.
 * Clicking a conversation navigates to /messages/:conversationId
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import VerifiedAvatar from "../components/VerifiedAvatar";
import { chatApi } from "../api/axios";
import { Search } from "lucide-react";

interface ConversationItem {
  id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_profile_image: string | null;
  other_user_is_verified?: boolean;
  last_message: string;
  last_message_time: string | null;
}

const formatTime = (iso: string | null): string => {
  if (!iso) return "";

  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString();
};

const MessagesPage = () => {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await chatApi.get<ConversationItem[]>("conversations/");
        setConversations(res.data || []);
        setError(null);
      } catch {
        setConversations([]);
        setError("Failed to load conversations.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleSelectConversation = (conversationId: number) => {
    navigate(`/messages/${conversationId}`);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-10 py-10">
        {/* Header */}
        <header className="mb-6 flex items-center gap-x-4">
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
          {!loading && (
            <span className="text-base text-gray-500">
              ({conversations.length} conversation
              {conversations.length !== 1 ? "s" : ""})
            </span>
          )}
        </header>

        {/* Search */}

        {/* Search */}
        <div className="mb-6 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search conversations by name..."
            className="w-full pl-10 pr-4 py-3 bg-green-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Conversation List */}
        <div className="bg-green-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-600 text-sm font-medium">
              {error}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No conversations found.
            </div>
          ) : (
            <div className="overflow-y-auto overflow-x-hidden">
              {filteredConversations.map((conv, index) => (
                <div key={conv.id}>
                  {index > 0 && (
                    <div
                      className="border-t border-gray-300 mx-6"
                      aria-hidden
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectConversation(conv.id)}
                    className="w-full flex items-center gap-4 px-6 py-6 hover:bg-green-100/70 transition-colors text-left group"
                  >
                    <div className="relative shrink-0">
                      <VerifiedAvatar
                        src={conv.other_user_profile_image ?? null}
                        username={conv.other_user_name}
                        isVerified={conv.other_user_is_verified ?? false}
                        size="sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate group-hover:text-green-700 transition-colors">
                        {conv.other_user_name}
                      </p>

                      <p className="text-gray-500 text-sm truncate mt-1">
                        {conv.last_message || "No messages yet"}
                      </p>
                    </div>

                    <p className="text-sm text-gray-400 shrink-0 font-medium">
                      {formatTime(conv.last_message_time)}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
