import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  Bot,
  LogOut,
  User,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

export default function Navbar({ onOpenChat, isChatOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/expenses', label: 'Expenses', icon: Receipt },
    { to: '/budgets', label: 'Budgets', icon: Wallet },
    { to: '/analytics', label: 'Analytics', icon: PieChart },
  ];

  return (
    <header style={{
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              color: 'var(--netflix-red)',
              fontSize: '1.6rem',
              fontWeight: '900',
              letterSpacing: '-0.5px',
              textTransform: 'uppercase',
              textShadow: '0 0 16px rgba(229, 9, 20, 0.5)'
            }}>
              FLIXPENSE
            </span>
            <span style={{
              backgroundColor: 'var(--netflix-red)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              AI
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav style={{ display: 'flex', gap: '0.5rem' }} className="desktop-nav">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--netflix-red)' : '2px solid transparent',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <Icon size={16} color="currentColor" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Action Icons: AI Chat trigger, User Profile, Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* AI Assistant Button */}
          <button
            onClick={onOpenChat}
            style={{
              backgroundColor: isChatOpen ? 'var(--netflix-red)' : 'rgba(229, 9, 20, 0.15)',
              color: isChatOpen ? '#fff' : '#FF4A50',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: isChatOpen ? '0 0 12px var(--netflix-red-glow)' : 'none'
            }}
            title="Open AI Expense Assistant"
          >
            <Sparkles size={16} />
            <span>AI Assistant</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px #10B981'
            }} />
          </button>

          {/* User Email Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }} className="user-pill">
            <User size={15} color="#A3A3A3" />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--transition-fast)'
            }}
            title="Sign Out"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--netflix-red)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <LogOut size={18} />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              padding: '0.4rem',
              color: '#fff'
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--netflix-dark)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                fontWeight: isActive ? '600' : '400',
              })}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
