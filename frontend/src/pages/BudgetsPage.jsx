import React, { useState, useEffect } from 'react';
import { budgetService } from '../services/api';
import { getCurrentMonthStr, formatINR } from '../utils/formatters';
import BudgetModal from '../components/BudgetModal';
import {
  Wallet,
  Plus,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  Trash2,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await budgetService.getOverview(selectedMonth);
      setOverview(res);
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth]);

  const handleDeleteBudget = async (id) => {
    if (window.confirm('Delete this budget?')) {
      try {
        await budgetService.deleteBudget(id);
        fetchBudgets();
      } catch (err) {
        console.error('Delete budget failed', err);
      }
    }
  };

  const getStatusBadge = (item) => {
    if (item.is_over_budget) {
      return (
        <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertOctagon size={13} />
          Over Budget ({item.percentage_used}%)
        </span>
      );
    }
    if (item.is_warning) {
      return (
        <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={13} />
          Warning &gt;80% ({item.percentage_used}%)
        </span>
      );
    }
    return (
      <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle size={13} />
        On Track ({item.percentage_used}%)
      </span>
    );
  };

  const getProgressColor = (item) => {
    if (item.is_over_budget) return 'var(--status-danger)';
    if (item.is_warning) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  return (
    <div className="container" style={{ padding: '2rem 0 4rem 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Budget Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Set monthly overall and category spending limits with automated warnings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--text-secondary)" />
            <input
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.9rem', width: '160px' }}
            />
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn-netflix">
            <Plus size={18} />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Overall Budget Hero Card */}
      {overview?.overall ? (
        <div className="netflix-card" style={{ marginBottom: '2rem', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff' }}>
                  Overall Monthly Budget
                </h2>
                {getStatusBadge(overview.overall)}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                Total spending limit for {selectedMonth}
              </p>
            </div>

            <button
              onClick={() => handleDeleteBudget(overview.overall.budget_id)}
              className="btn-icon"
              title="Remove Overall Budget"
            >
              <Trash2 size={16} color="#EF4444" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Budget Limit</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>
                {overview.overall.formatted_budget}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spent So Far</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: getProgressColor(overview.overall) }}>
                {overview.overall.formatted_spent}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Remaining</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: overview.overall.remaining_amount < 0 ? 'var(--status-danger)' : '#fff' }}>
                {overview.overall.formatted_remaining}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Consumed</span>
              <span style={{ fontWeight: '700', color: getProgressColor(overview.overall) }}>
                {overview.overall.percentage_used}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, overview.overall.percentage_used))}%`,
                height: '100%',
                backgroundColor: getProgressColor(overview.overall),
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="netflix-card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(229, 9, 20, 0.1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--netflix-red)',
            marginBottom: '1rem'
          }}>
            <Wallet size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>No Overall Budget Set for {selectedMonth}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0.5rem auto 1.25rem' }}>
            Set a monthly cap to receive automated alerts at 80% consumption and when expenses exceed your target.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-netflix">
            <Plus size={16} />
            <span>Set Overall Budget</span>
          </button>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '1.25rem' }}>
          Category-Specific Budgets
        </h2>

        {overview?.categories?.length === 0 ? (
          <div className="netflix-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No category budgets created for this month yet. Click "+ Set Budget" to specify limits for Groceries, Food, Travel, etc.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem' }}>
            {overview?.categories?.map((c) => (
              <div key={c.budget_id || c.category} className="netflix-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                      {c.category_display}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Limit: {c.formatted_budget}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusBadge(c)}
                    <button
                      onClick={() => handleDeleteBudget(c.budget_id)}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="Delete category budget"
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Spent: <strong>{c.formatted_spent}</strong></span>
                  <span style={{ color: c.remaining_amount < 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                    Remaining: <strong>{c.formatted_remaining}</strong>
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, c.percentage_used))}%`,
                    height: '100%',
                    backgroundColor: getProgressColor(c),
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchBudgets}
        initialMonth={selectedMonth}
      />
    </div>
  );
}
