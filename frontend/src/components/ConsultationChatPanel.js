import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../utils/api";
import { MessageSquare, Send } from "lucide-react";

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ConsultationChatPanel({
  role = "user",
  className = "",
}) {
  const isDoctor = role === "doctor";
  const threadsEndpoint = isDoctor
    ? "/doctor/patient-chats"
    : "/user/doctor-chats";
  const messagesEndpointBase = isDoctor
    ? "/doctor/patient-chats"
    : "/user/doctor-chats";

  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [canChat, setCanChat] = useState(true);
  const [appointmentDateTime, setAppointmentDateTime] = useState(null);
  const messagesEndRef = useRef(null);

  const title = useMemo(() => {
    if (!selected) return isDoctor ? "Patient Chat" : "Doctor Chat";
    return isDoctor
      ? selected.patient_name || "Patient"
      : selected.doctor_name || "Doctor";
  }, [selected, isDoctor]);

  const loadThreads = async () => {
    setError("");
    setLoadingThreads(true);
    try {
      const res = await api.get(threadsEndpoint);
      const list = res.data?.threads || [];
      setThreads(list);
      if (!selected && list.length > 0) {
        setSelected(list[0]);
      }
    } catch (e) {
      const msg = e.response?.data?.message;
      setError(
        [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
          "Failed to load chats",
      );
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (appointmentId, isInitialLoad = false) => {
    if (!appointmentId) return;
    setError("");
    // Only show loading indicator on initial load, not during background refreshes
    if (isInitialLoad) {
      setLoadingMessages(true);
    }
    try {
      const res = await api.get(
        `${messagesEndpointBase}/${appointmentId}/messages`,
      );
      setMessages(res.data?.messages || []);
      setCanChat(res.data?.can_chat !== false);

      // Store appointment date/time for display
      if (res.data?.appointment_date && res.data?.appointment_time) {
        const dateStr = res.data.appointment_date.split("T")[0];
        const timeStr = res.data.appointment_time;
        setAppointmentDateTime(`${dateStr} ${timeStr}`);
      }
    } catch (e) {
      const msg = e.response?.data?.message;
      // Only show errors on initial load to avoid spamming
      if (isInitialLoad) {
        setError(
          [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
            "Failed to load messages",
        );
      }
      // If backend returns chat not available error, disable chat
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
      await api.post(
        `${messagesEndpointBase}/${selected.appointment_id}/messages`,
        {
          message: text,
        },
      );
      // Silent refresh after sending message
      await Promise.all([
        loadMessages(selected.appointment_id, false),
        loadThreads(),
      ]);
    } catch (e) {
      const msg = e.response?.data?.message;
      setError(
        [e.response?.data?.error, msg].filter(Boolean).join(": ") ||
          "Failed to send message",
      );
      // If time restriction error, disable chat
      if (e.response?.data?.can_chat === false) {
        setCanChat(false);
      }
    }
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!selected?.appointment_id) {
      setMessages([]);
      return;
    }
    // Initial load with loading indicator
    loadMessages(selected.appointment_id, true);

    // Background refresh every 20 seconds without loading indicator
    const interval = setInterval(() => {
      loadMessages(selected.appointment_id, false);
      loadThreads();
    }, 20000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.appointment_id, role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      className={`bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isDoctor ? "Patient Chat" : "Doctor Chat"}
            </h2>
            <p className="text-xs text-gray-500">
              Chat is linked to your booked appointments
            </p>
          </div>
          <button
            type="button"
            onClick={loadThreads}
            className="text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
        {/* Thread list */}
        <div className="border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col min-h-0">
          <div className="p-4 flex-1 min-h-0 overflow-y-auto">
            {loadingThreads ? (
              <p className="text-sm text-gray-500">Loading chats…</p>
            ) : threads.length === 0 ? (
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No booked chats yet
                </p>
                <p>Book an appointment to start chatting.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((t) => {
                  const active = selected?.appointment_id === t.appointment_id;
                  const name = isDoctor ? t.patient_name : t.doctor_name;
                  const sub =
                    t.last_message ||
                    (isDoctor ? "No messages yet" : "No messages yet");
                  return (
                    <button
                      key={t.appointment_id}
                      type="button"
                      onClick={() => setSelected(t)}
                      className={`w-full text-left rounded-2xl border px-3 py-3 transition ${
                        active
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {name || "Conversation"}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {sub}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Appt #{t.appointment_id}
                        {t.last_message_at
                          ? ` • ${formatTime(t.last_message_at)}`
                          : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {error ? (
              <p className="text-xs text-red-600 mt-3">{error}</p>
            ) : null}
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-gray-200 bg-white">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </p>
            {selected?.appointment_date ? (
              <p className="text-xs text-gray-500">
                Appointment: {selected.appointment_date}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Select a conversation to start
              </p>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-white">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a chat to view messages</p>
                </div>
              </div>
            ) : loadingMessages ? (
              <p className="text-sm text-gray-500">Loading messages…</p>
            ) : !canChat ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-md">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-amber-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Chat Not Available Yet
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    You can start messaging after your appointment time:
                  </p>
                  {appointmentDateTime && (
                    <p className="text-sm font-medium text-amber-700 bg-amber-100 px-4 py-2 rounded-lg inline-block">
                      {new Date(appointmentDateTime).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-4">
                    This ensures meaningful communication during and after your
                    consultation.
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                No messages yet. Say hello.
              </p>
            ) : (
              messages.map((m) => {
                const mine = isDoctor
                  ? m.sender_role === "doctor"
                  : m.sender_role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        mine
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                      <p
                        className={`text-[11px] mt-1 ${
                          mine ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {!canChat && selected && (
              <div className="mb-3 text-center">
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-block">
                  💬 Chat will be available after your appointment time
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canChat && sendMessage()}
                disabled={!selected || !canChat}
                placeholder={
                  !selected
                    ? "Select a chat first"
                    : !canChat
                      ? "Chat available after appointment time"
                      : "Type a message…"
                }
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!selected || !canChat}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
