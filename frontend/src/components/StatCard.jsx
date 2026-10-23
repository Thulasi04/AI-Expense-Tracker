import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function StatCard({
  title,
  amount,
  subtitle,
  change,
  changeType,
  icon: Icon,
  badgeText,
  badgeType = 'neutral',
  progress = null
}) {
  return (
    <div className="netflix-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Top subtle red accent line on card */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: 'var(--netflix-red)',
        opacity: 0.8
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(229, 9, 20, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--netflix-red)'
          }}>
            <Icon size={19} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px', marginBottom: '0.4rem' }}>
        {amount}
      </div>

      {/* Change indicator or subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
        {change !== undefined && change !== null && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            fontWeight: '600',
            color: changeType === 'increase' ? '#EF4444' : (changeType === 'decrease' ? '#10B981' : '#A3A3A3'),
            backgroundColor: changeType === 'increase' ? 'rgba(239, 68, 68, 0.12)' : (changeType === 'decrease' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.08)'),
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {changeType === 'increase' && <ArrowUpRight size={14} />}
            {changeType === 'decrease' && <ArrowDownRight size={14} />}
            {changeType === 'flat' && <Minus size={14} />}
            {Math.abs(change)}%
          </span>
        )}

        {subtitle && (
          <span style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </span>
        )}

        {badgeText && (
          <span className={`badge badge-${badgeType}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Progress Bar (if provided, e.g. for Budget usage) */}
      {progress !== null && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{
            width: '100%',
            height: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: progress >= 100 ? 'var(--status-danger)' : (progress >= 80 ? 'var(--status-warning)' : 'var(--status-success)')
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
