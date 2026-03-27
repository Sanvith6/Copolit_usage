import React, { useState, useRef, useEffect } from 'react';
import './ChatWindow.css';

export default function ChatWindow({ user, chat, messages, onSend, onTyping, typingUsers, onlineUsers, getOtherParticipant }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    if (isTyping) { onTyping(false); setIsTyping(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTyping) { setIsTyping(true); onTyping(true); }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { setIsTyping(false); onTyping(false); }, 1500);
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getAvatar = (name) => name ? name.charAt(0).toUpperCase() : '?';

  if (!chat) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h2>WhatsApp Web</h2>
          <p>Send and receive messages without keeping your phone online.</p>
          <p>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
        </div>
      </div>
    );
  }

  const other = getOtherParticipant(chat);
  const isOtherTyping = other && typingUsers[other._id];
  const isOtherOnline = other && onlineUsers.includes(other._id);

  const groupMessages = () => {
    const groups = [];
    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      const sameSender = prev && (prev.sender._id === msg.sender._id || prev.sender === msg.sender);
      if (!sameSender || groups.length === 0) groups.push([msg]);
      else groups[groups.length - 1].push(msg);
    });
    return groups;
  };

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-avatar-wrap">
          <div className="chat-header-avatar">{other ? getAvatar(other.username) : '?'}</div>
          {isOtherOnline && <div className="header-online-badge" />}
        </div>
        <div className="chat-header-info">
          <span className="chat-header-name">{other?.username}</span>
          <span className="chat-header-status">
            {isOtherTyping ? 'typing...' : isOtherOnline ? 'online' : other?.status || 'offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        <div className="messages-inner">
          {groupMessages().map((group, gi) => {
            const isMine = group[0].sender._id === user.id || group[0].sender === user.id;
            return (
              <div key={gi} className={`message-group ${isMine ? 'mine' : 'theirs'}`}>
                {group.map((msg, mi) => (
                  <div key={msg._id} className={`message-bubble ${isMine ? 'sent' : 'received'} ${mi === group.length - 1 ? 'last' : ''}`}>
                    <span className="message-text">{msg.content}</span>
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                    {isMine && mi === group.length - 1 && <span className="read-ticks">✓✓</span>}
                  </div>
                ))}
              </div>
            );
          })}
          {isOtherTyping && (
            <div className="message-group theirs">
              <div className="message-bubble received typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder="Type a message"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className={`send-btn ${input.trim() ? 'active' : ''}`} onClick={handleSend}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
