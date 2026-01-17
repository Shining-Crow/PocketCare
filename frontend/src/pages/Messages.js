import React, { useEffect, useRef, useState } from "react";
import api from "../utils/api";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCheck,
  Search,
  Smile,
  Paperclip,
  Phone,
  Video,
  Info,
  Star,
  Calendar,
  Sparkles,
} from "lucide-react";
import BackToDashboardButton from "../components/BackToDashboardButton";

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
    return "";
  }
}

export default function Messages() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [canChat, setCanChat] = useState(true);
  const [appointmentDateTime, setAppointmentDateTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const messagesEndRef = useRef(null);

  const loadThreads = async () => {
    setError("");
    setLoadingThreads(true);
    try {
      const res = await api.get("/user/doctor-chats");
      const list = res.data?.threads || [];
      setThreads(list);
      if (!selected && list.length > 0) {
        setSelected(list[0]);
      }
    } catch (e) {
      const msg = e.response?.data?.message;
      setError(
        [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
          "Failed to load chats"
      );
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (appointmentId, isInitialLoad = false) => {
    if (!appointmentId) return;
    setError("");
    if (isInitialLoad) {
      setLoadingMessages(true);
    }
    try {
      const res = await api.get(`/user/doctor-chats/${appointmentId}/messages`);
      setMessages(res.data?.messages || []);
      setCanChat(res.data?.can_chat === true);

      if (res.data?.appointment_date && res.data?.appointment_time) {
        const dateStr = res.data.appointment_date.split("T")[0];
        const timeStr = res.data.appointment_time;
        setAppointmentDateTime(`${dateStr} ${timeStr}`);
      }
    } catch (e) {
      const msg = e.response?.data?.message;
      if (isInitialLoad) {
        setError(
          [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
            "Failed to load messages"
        );
      }
      if (e.response?.data?.can_chat === false) {
        setCanChat(false);
      }
    } finally {
      if (isInitialLoad) {
        setLoadingMessages(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!selected?.appointment_id) return;
    if (!canChat) {
      setError("Chat is not available until the appointment time");
      return;
    }
    const text = messageText.trim();
    if (!text) return;

    setMessageText("");
    setError("");
    try {
      await api.post(`/user/doctor-chats/${selected.appointment_id}/messages`, {
        message: text,
      });
      await Promise.all([
        loadMessages(selected.appointment_id, false),
        loadThreads(),
      ]);
    } catch (e) {
      const msg = e.response?.data?.message;
      setError(
        [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
          "Failed to send message"
      );
      if (e.response?.data?.can_chat === false) {
        setCanChat(false);
      }
    }
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected?.appointment_id) {
      setMessages([]);
      return;
    }
    loadMessages(selected.appointment_id, true);

    const interval = setInterval(() => {
      loadMessages(selected.appointment_id, false);
      loadThreads();
    }, 20000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.appointment_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Timer effect for appointment countdown
  useEffect(() => {
    if (!appointmentDateTime || canChat) {
      setTimeRemaining("");
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const appointmentTime = new Date(appointmentDateTime);
      const diff = appointmentTime - now;

      if (diff <= 0) {
        setTimeRemaining("Any moment now...");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) {
        timeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        timeString = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeString = `${minutes}m ${seconds}s`;
      } else {
        timeString = `${seconds}s`;
      }

      setTimeRemaining(timeString);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [appointmentDateTime, canChat]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex overflow-hidden">
      {/* Left Sidebar - Doctor List (Instagram-like) */}
      <div className="w-full md:w-96 border-r border-white/50 flex flex-col bg-white/80 backdrop-blur-xl shadow-xl h-full">
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BackToDashboardButton className="shrink-0" />
              <h1 className="text-2xl font-bold text-blue-600">Messages</h1>
            </div>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition-all duration-300"
            />
          </div>
        </div>

        {/* Doctor List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent">
          {loadingThreads ? (
            <div className="p-6 text-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="text-sm text-gray-600 mt-3 font-medium">
                Loading chats...
              </p>
            </div>
          ) : threads.filter((thread) => {
              const doctorName = thread.doctor_name || "Doctor";
              return doctorName
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            }).length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-800 mb-2 text-lg">
                {searchQuery ? "No results found" : "No messages yet"}
              </p>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? `No doctors matching "${searchQuery}"`
                  : "Book an appointment to start chatting with your doctor"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {threads
                .filter((thread) => {
                  const doctorName = thread.doctor_name || "Doctor";
                  return doctorName
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
                })
                .map((thread) => {
                  const isActive =
                    selected?.appointment_id === thread.appointment_id;
                  const doctorName = thread.doctor_name || "Doctor";
                  const lastMessage = thread.last_message || "No messages yet";
                  const lastMessageTime = thread.last_message_at;

                  return (
                    <button
                      key={thread.appointment_id}
                      type="button"
                      onClick={() => setSelected(thread)}
                      className={`w-full text-left px-4 py-3 mb-2 flex items-center gap-3 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                        isActive
                          ? "bg-gradient-to-r from-blue-300 to-purple-500 text-white shadow-sm"
                          : "hover:bg-white/50 border-2 border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm ring-4 ring-white">
                          {doctorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-3 border-white rounded-full ring-2 ring-white"></div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3
                            className={`font-bold truncate text-sm flex items-center gap-1 ${
                              isActive ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {doctorName}
                          </h3>
                          {lastMessageTime && (
                            <span
                              className={`text-xs font-medium ml-2 flex-shrink-0 ${
                                isActive ? "text-white/90" : "text-blue-600"
                              }`}
                            >
                              {formatTime(lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate font-medium ${
                            isActive ? "text-white/80" : "text-gray-600"
                          }`}
                        >
                          {lastMessage}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar
                            className={`w-3 h-3 ${
                              isActive ? "text-white/70" : "text-gray-400"
                            }`}
                          />
                          <p
                            className={`text-[10px] ${
                              isActive ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            Appt #{thread.appointment_id}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Messages Area (Instagram-like) */}
      <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-xl overflow-hidden h-full">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-pulse opacity-20"></div>
                <div className="relative w-32 h-32 rounded-full border-4 border-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center bg-white shadow-2xl">
                  <MessageSquare className="w-16 h-16 text-blue-600" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
              </div>
              <h2 className="text-3xl font-bold text-blue-600 mb-3">
                Your messages
              </h2>
              <p className="text-gray-600 font-medium">
                Send messages to your doctors from your booked appointments
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4 bg-white/90 backdrop-blur-xl shadow-sm">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm ring-4 ring-blue-100">
                  {(selected.doctor_name || "D").charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  {selected.doctor_name || "Doctor"}
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </h2>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
                  {selected.appointment_date
                    ? `Appointment: ${formatDate(selected.appointment_date)}`
                    : "Active now"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 transition-all duration-300 transform hover:scale-110">
                  <Phone className="w-5 h-5 text-blue-600" />
                </button>
                <button className="p-2.5 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 hover:opacity-95 transition-all duration-300 transform hover:scale-110">
                  <Video className="w-5 h-5 text-blue-700" />
                </button>
                <button className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 transform hover:scale-110">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-br from-blue-50/30 via-indigo-50/30 to-purple-50/30 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent min-h-0">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                </div>
              ) : !canChat ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center bg-white/80 backdrop-blur-xl border-2 border-gradient-to-r from-amber-200 to-orange-200 rounded-3xl p-8 max-w-md shadow-2xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Clock className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-600 mb-2">
                      Chat Not Available Yet
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 font-medium">
                      You can start messaging after your appointment time
                    </p>
                    {timeRemaining && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2 font-medium">
                          Time remaining:
                        </p>
                        <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl px-6 py-4 shadow-sm">
                          <p className="text-3xl font-bold tracking-wider text-gray-700">
                            {timeRemaining}
                          </p>
                        </div>
                      </div>
                    )}
                    {appointmentDateTime && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl px-5 py-4 shadow-inner">
                        <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center justify-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Appointment scheduled for:
                        </p>
                        <p className="text-sm font-bold text-amber-900">
                          {new Date(appointmentDateTime).toLocaleString(
                            "en-US",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <MessageSquare className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-semibold">
                      No messages yet
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Start the conversation 💬
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isMine = msg.sender_role === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        } animate-fade-in`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {!isMine && (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-2 flex-shrink-0 shadow-sm ring-2 ring-white">
                            {(selected.doctor_name || "D")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-3xl px-5 py-3 transform transition-all duration-300 hover:scale-[1.02] ${
                            isMine
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                              : "bg-white border-2 border-gray-100 text-gray-900 shadow-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>
                          <div
                            className={`flex items-center gap-1.5 mt-2 ${
                              isMine ? "justify-end" : ""
                            }`}
                          >
                            <p
                              className={`text-xs font-medium ${
                                isMine ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                            {isMine && (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-6 py-5 border-t border-gray-100 bg-white/90 backdrop-blur-xl flex-shrink-0">
              {!canChat && (
                <div className="mb-3 text-center">
                  <p className="text-xs font-semibold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 rounded-full inline-flex items-center gap-2 border border-amber-200 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Chat will be available after your appointment time
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 transform hover:scale-110 disabled:opacity-50"
                  disabled={!canChat}
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && canChat) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={!canChat}
                    placeholder={
                      !canChat
                        ? "Chat available after appointment time"
                        : "Type a message..."
                    }
                    className="w-full px-6 py-3.5 rounded-full border-2 border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500 text-sm transition-all duration-300 bg-gray-50"
                  />
                </div>
                <button
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 transform hover:scale-110 disabled:opacity-50"
                  disabled={!canChat}
                >
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!messageText.trim() || !canChat}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:opacity-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transform hover:scale-110 active:scale-95"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-2 text-center font-medium bg-red-50 px-3 py-2 rounded-full inline-block">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
