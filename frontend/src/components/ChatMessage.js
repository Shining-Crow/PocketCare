import React from 'react';
import ReactMarkdown from 'react-markdown';

function ChatMessage({ sender, text }) {
  return (
    <div className={`mb-2 flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-4 py-2 rounded-lg max-w-xs whitespace-pre-wrap ${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-900 border'}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

export default ChatMessage;
