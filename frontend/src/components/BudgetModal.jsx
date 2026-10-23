import React, { useState, useEffect } from 'react';
import { budgetService, categoryService } from '../services/api';
import { getCurrentMonthStr } from '../utils/formatters';
import { X, Wallet } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  "Food", "Groceries", "Restaurants", "Transport", "Entertainment",
  "Bills & Utilities", "Shopping", "Healthcare", "Education", "Rent",
  "Travel", "Personal Care", "Other"
];

export default function BudgetModal({ isOpen, onClose, onSaved, initialMonth = null }) {
  const [month, setMonth] = useState(initialMonth || getCurrentMonthStr());
  const [category, setCategory] = useState('__TOTAL__');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCats() {
      try {
        const res = await categoryService.getCategories();
        if (res && res.length > 0) {
          setCategories(res.map(c => c.name));
        }
      } catch (e) {
        // use fallback
      }
    }
    loadCats();
  }, []);

  useEffect(() => {
    if (initialMonth) setMonth(initialMonth);
    setAmount('');
    setError('');
  }, [isOpen, initialMonth]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid budget amount greater than ₹0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await budgetService.setBudget({
        month,
        category: category === '__TOTAL__' ? null : category,
        amount: numAmount
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error setting budget:', err);
      setError(err.response?.data?.detail || 'Failed to set budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wallet size={20} color="var(--netflix-red)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
              Set Monthly Budget
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FF6B6B',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
              Month *
            </label>
            <input
              type="month"
              required
              className="form-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
              Budget Scope *
            </label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="__TOTAL__" style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                🌟 Overall Monthly Budget (All Categories)
              </option>
              <optgroup label="Category Specific Budgets">
                {categories.map((cat) => (
                  <option key={cat} value={cat} style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                    {cat}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
              Budget Limit in INR (₹) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--netflix-red)',
                fontSize: '1.1rem',
                fontWeight: '700'
              }}>
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="100"
                required
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '1.1rem', fontWeight: '600' }}
                placeholder="25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Warnings trigger automatically at 80% consumption and 100%+ over-budget.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-netflix" disabled={loading}>
              {loading ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
