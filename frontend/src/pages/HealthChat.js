import React, { useState } from 'react';
import axios from 'axios';
import ChatMessage from '../components/ChatMessage';

function HealthChat() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your AI health assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const res = await axios.post('/api/chat/send', { message: input });
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: res.data.response || 'Sorry, I could not understand that.' }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'There was an error connecting to the AI service.' }
      ]);
    }
    setInput('');
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 h-[80vh] flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Health Chat</h2>
      <div className="flex-1 overflow-y-auto bg-gray-100 rounded p-4 mb-4">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} sender={msg.sender} text={msg.text} />
        ))}
        {loading && (
          <div className="mb-2 flex justify-start">
            <div className="px-4 py-2 rounded-lg max-w-xs bg-white text-gray-900 border animate-pulse">
              AI is typing...
            </div>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your health question..."
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          type="submit"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">This AI is for informational purposes only and not a substitute for professional medical advice.</p>
    </div>
  );
}

export default HealthChat;
