import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import api from "../utils/api";
import ChatMessage from "../components/ChatMessage";
import BackToDashboardButton from "../components/BackToDashboardButton";

function HealthChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);

  const welcomeMessage = useMemo(
    () => ({
      sender: "ai",
      text: "Hello! I am your AI health assistant. How can I help you today?",
    }),
    []
  );

  // Fetch chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/chat/history");
        if (
          res.data &&
          Array.isArray(res.data.history) &&
          res.data.history.length
        ) {
          const sorted = res.data.history
            .map((msg) => ({
              sender: msg.sender,
              text: msg.message,
              created_at: msg.created_at,
            }))
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          setMessages(sorted);
        } else {
          setMessages([welcomeMessage]);
        }
      } catch (err) {
        setMessages([welcomeMessage]);
      }
    };
    fetchHistory();
  }, [welcomeMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const res = await api.post("/chat/send", { message: input });
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.data.response || "Sorry, I could not understand that.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "There was an error connecting to the AI service.",
        },
      ]);
    }
    setInput("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="max-w-5xl w-full flex flex-col px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-32px)]">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <BackToDashboardButton className="shrink-0" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <span>Health Chat</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Assistant
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Ask symptoms, medications, or general health questions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Surface */}
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-white/80 backdrop-blur border border-gray-200 shadow-sm overflow-hidden">
            {/* Messages */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6"
            >
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} sender={msg.sender} text={msg.text} />
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3 max-w-[85%]">
                      <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold">
                        AI
                      </div>
                      <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Thinking</span>
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.2s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.1s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"></span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Composer - always visible at bottom of chat card */}
            <div className="border-t border-gray-200 bg-white/90">
              <form onSubmit={sendMessage} className="px-4 sm:px-6 py-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-200 transition">
                      <textarea
                        className="w-full resize-none bg-transparent px-4 py-3 outline-none text-gray-900 placeholder:text-gray-400"
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Message PocketCare AI…"
                        disabled={loading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                          }
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      This AI is for informational purposes only and not a
                      substitute for professional medical advice.
                    </p>
                  </div>

                  <button
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthChat;
