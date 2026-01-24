import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot } from "lucide-react";

function ChatMessage({ sender, text }) {
  const isUser = sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex items-start gap-3 max-w-[85%] ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        {/* Avatar (AI only) */}
        {!isUser && (
          <div
            className="w-9 h-9 shrink-0 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold"
            aria-hidden="true"
          >
            <Bot className="w-5 h-5" />
          </div>
        )}

        {/* Bubble */}
        <div
          className={
            isUser
              ? "px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
              : "px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm"
          }
        >
          <div
            className={`prose prose-sm max-w-none ${
              isUser ? "prose-invert" : ""
            }`}
          >
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
