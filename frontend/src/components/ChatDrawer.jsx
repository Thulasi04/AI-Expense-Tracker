import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/api';
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const SUGGESTIONS = [
  "I spent ₹450 on groceries at Reliance Fresh yesterday.",
  "Add coffee ₹120, lunch ₹250 and Uber ₹180 today.",
  "Compare this month with last month.",
  "Show my five biggest expenses last week.",
  "What was my total spending yesterday?",
  "Analyze my spending patterns."
];

export default function ChatDrawer({ isOpen, onClose, onDataRefresh }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hello! I am your AI Financial Assistant. You can tell me expenses naturally in Indian Rupees (₹), ask questions about your budget, or request deep spending insights.\n\nTry saying: *'I spent ₹450 on groceries at Reliance Fresh yesterday'* or *'Compare this month with last month'*."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingAction]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await chatService.sendMessage(text, sessionId);
      if (resp.session_id) {
        setSessionId(resp.session_id);
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resp.message
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Check if there is a pending confirmation action (e.g. multi-delete confirmation)
      if (resp.pending_confirmation) {
        setPendingAction(resp.pending_confirmation);
      } else {
        setPendingAction(null);
      }

      // If database was modified (created, updated, or deleted expenses), trigger refresh of dashboard/tables
      if (resp.refreshed_data_needed && onDataRefresh) {
        onDataRefresh();
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "⚠️ Sorry, I encountered an issue processing your request. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (confirmed) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const resp = await chatService.confirmAction(sessionId, confirmed);
      setPendingAction(null);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: resp.message
        }
      ]);
      if (resp.refreshed_data_needed && onDataRefresh) {
        onDataRefresh();
      }
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setSessionId(null);
    setPendingAction(null);
    setMessages([
      {
        id: 'welcome_new',
        role: 'assistant',
        content: "New chat started! How can I help you manage your expenses today?"
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      maxWidth: '440px',
      height: '100vh',
      backgroundColor: 'var(--netflix-dark)',
      borderLeft: '1px solid var(--border-subtle)',
      boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.7)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.2rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--netflix-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(229, 9, 20, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(229, 9, 20, 0.4)'
          }}>
            <Bot size={20} color="var(--netflix-red)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>Flixpense AI Assistant</h3>
            <span style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              Active &amp; Natural Language Ready
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleResetChat}
            className="btn-icon"
            title="Start New Chat"
            style={{ width: '32px', height: '32px' }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onClose}
            className="btn-icon"
            title="Close Assistant"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              maxWidth: '88%',
              alignItems: 'flex-start'
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--netflix-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Sparkles size={14} color="#fff" />
                </div>
              )}

              <div style={{
                backgroundColor: msg.role === 'user' ? 'var(--netflix-red)' : 'var(--netflix-card)',
                color: '#FFFFFF',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                lineHeight: '1.45',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: msg.role === 'user' ? '0 2px 8px var(--netflix-red-glow)' : '0 2px 6px rgba(0,0,0,0.4)'
              }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--netflix-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div style={{
              backgroundColor: 'var(--netflix-card)',
              border: '1px solid var(--border-subtle)',
              padding: '0.6rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>Analyzing &amp; executing database operation...</span>
            </div>
          </div>
        )}

        {/* Pending Confirmation Card */}
        {pendingAction && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: '700', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>Confirmation Required</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              {pendingAction.description} for total of <strong>{pendingAction.formatted_total_amount}</strong> ({pendingAction.count} items).
            </p>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => handleConfirmAction(true)}
                className="btn-netflix"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                disabled={loading}
              >
                Yes, Delete Them
              </button>
              <button
                onClick={() => handleConfirmAction(false)}
                className="btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '0.4rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        backgroundColor: 'rgba(0,0,0,0.2)'
      }}>
        {SUGGESTIONS.map((sugg, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(sugg)}
            disabled={loading}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {sugg}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--netflix-card)'
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            position: 'relative'
          }}
        >
          <input
            type="text"
            className="form-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type 'Coffee ₹120, Lunch ₹250 today'..."
            disabled={loading}
            style={{ paddingRight: '45px', fontSize: '0.9rem' }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            style={{
              position: 'absolute',
              right: '6px',
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: inputText.trim() ? 'var(--netflix-red)' : 'transparent',
              color: inputText.trim() ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Send size={16} />
          </button>
        </form>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
          All commands execute verified database transactions in INR (₹).
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </aside>
  );
}
