/**
 * Single chat window: fetches old messages, connects WebSocket for real-time.
 * Shows the other person's profile and lets you open their verification badge.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SendHorizontal, ArrowLeft, X } from "lucide-react";
import Navbar from "../components/Navbar";
import VerifiedAvatar from "../components/VerifiedAvatar";
import CaregiverProfileCard from "../components/CaregiverProfileCard";
import type { CaregiverProfileCardData } from "../components/CaregiverProfileCard";
import api, { chatApi, subscribeAccessTokenRefresh } from "../api/axios";

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
}

interface OtherUser {
  id: number;
  name: string;
  profile_image: string | null;
  isVerified?: boolean;
}

const formatMessageTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateDivider = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getWebSocketUrl = (conversationId: number): string => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("access");
  const base = "ws://localhost:8000";
  return `${base}/ws/chat/${conversationId}/?token=${encodeURIComponent(token || "")}`;
};

const ChatPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<CaregiverProfileCardData | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchOtherUser = async (convId: number) => {
    try {
      const res = await chatApi.get<
        Array<{
          id: number;
          other_user_id: number;
          other_user_name: string;
          other_user_profile_image: string | null;
        }>
      >("conversations/");
      const conv = (res.data || []).find((c) => c.id === convId);
      if (conv) {
        let isVerified = false;
        try {
          const profileRes = await api.get<{ verification_status?: string }>(
            `admin/profile/${conv.other_user_id}/`
          );
          isVerified = profileRes.data?.verification_status === "approved";
        } catch {
          /* verification fetch optional */
        }
        setOtherUser({
          id: conv.other_user_id,
          name: conv.other_user_name,
          profile_image: conv.other_user_profile_image,
          isVerified,
        });
      } else {
        setOtherUser({ id: 0, name: "User", profile_image: null });
      }
    } catch {
      setOtherUser({ id: 0, name: "User", profile_image: null });
    }
  };

  const fetchMessages = async (convId: number) => {
    try {
      const res = await chatApi.get<Message[]>(`messages/${convId}/`);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const connectWebSocket = useCallback((convId: number) => {
    const url = getWebSocketUrl(convId);
    const ws = new WebSocket(url);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "presence") return;
        const msg = data as Message;
        if (msg && msg.id && msg.text) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      } catch {
        /* ignore */
      }
    };

    wsRef.current = ws;
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ text: message.trim() }));
    }
    setMessage("");
  };

  useEffect(() => {
    const id = conversationId ? parseInt(conversationId, 10) : null;
    if (!id) {
      setError("Invalid conversation.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const load = async () => {
      await Promise.all([fetchMessages(id), fetchOtherUser(id)]);
      setLoading(false);
      connectWebSocket(id);
    };
    load();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, connectWebSocket]);

  useEffect(() => {
    const id = conversationId ? parseInt(conversationId, 10) : null;
    if (!id) return;
    return subscribeAccessTokenRefresh(() => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      connectWebSocket(id);
    });
  }, [conversationId, connectWebSocket]);

  const currentUserId = parseInt(localStorage.getItem("user_id") || "0", 10);

  const handleBack = () => {
    navigate("/messages");
  };

  const openProfileModal = async () => {
    if (!otherUser?.id) return;
    setProfileModalOpen(true);
    setProfileModalData(null);
    setProfileModalLoading(true);
    try {
      const res = await api.get(`admin/profile/${otherUser.id}/`);
      setProfileModalData(res.data);
    } catch {
      setProfileModalData({
        username: otherUser.name,
        role: "caregiver",
        verification_status: otherUser.isVerified ? "approved" : undefined,
        profile_image: otherUser.profile_image,
        caregiver_details: {},
      });
    } finally {
      setProfileModalLoading(false);
    }
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileModalData(null);
  };

  // Build message list with date dividers
  const messageElements = (() => {
    let lastDate = "";
    const elements: React.ReactNode[] = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        elements.push(
          <div key={`divider-${msgDate}`} className="text-xs text-gray-400 text-center my-4">
            {formatDateDivider(msg.created_at)}
          </div>
        );
      }

      const isMe = msg.sender_id === currentUserId;
      elements.push(
        <div
          key={msg.id}
          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
        >
          <div
            className={`rounded-xl px-4 py-2 max-w-[70%] ${
              isMe
                ? "bg-green-500 text-white"
                : "bg-gray-100 border border-green-200/40 text-gray-800"
            }`}
          >
            <p>{msg.text}</p>
          </div>
          <span className="text-xs text-gray-400 mt-0.5">
            {formatMessageTime(msg.created_at)}
          </span>
        </div>
      );
    });

    return elements;
  })();

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-6 mt-8">
          <p className="text-gray-500">Select a conversation from the Messages page.</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 text-green-600 hover:underline"
          >
            ← Back to Messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-3xl mx-auto mt-4 px-4">
        <div className="flex flex-col h-[80vh] bg-green-50 rounded-xl border border-green-200/40 shadow-sm overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-400 bg-green-50 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-green-100 text-gray-600 hover:text-gray-800 shrink-0"
              aria-label="Back to messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="cursor-pointer hover:opacity-90 shrink-0">
              <VerifiedAvatar
                src={otherUser?.profile_image ?? null}
                username={otherUser?.name ?? "User"}
                isVerified={otherUser?.isVerified ?? false}
                size="s"
                onClick={otherUser?.id ? openProfileModal : undefined}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {otherUser?.name ?? "Loading..."}
              </p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 px-4 pb-4 space-y-3 scroll-smooth bg-green-50">
            {loading ? (
              <div className="flex justify-center py-12 text-gray-500 text-sm">
                Loading messages...
              </div>
            ) : error ? (
              <div className="flex justify-center py-12 text-red-600 text-sm">
                {error}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center py-12 text-gray-500 text-sm">
                No messages yet. Say hello to start the conversation.
              </div>
            ) : (
              <>
                {messageElements}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 pt-3 pb-2 px-3 border-t border-gray-400 bg-green-50 shrink-0">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-white border border-green-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!message.trim() || !wsConnected}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors"
              aria-label="Send"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile modal – same as Find Caregiver */}
      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeProfileModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProfileModal}
              className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {profileModalLoading ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl overflow-hidden shadow-md flex items-center justify-center min-h-[200px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : (
              <CaregiverProfileCard profile={profileModalData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
