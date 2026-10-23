import React, { useState, useEffect } from 'react';
import { expenseService, categoryService } from '../services/api';
import { X, Check, IndianRupee, Tag, Calendar, Store, CreditCard } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  "Food", "Groceries", "Restaurants", "Transport", "Entertainment",
  "Bills & Utilities", "Shopping", "Healthcare", "Education", "Rent",
  "Travel", "Personal Care", "Other"
];

const PAYMENT_METHODS = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "Other"];

export default function ExpenseFormModal({ isOpen, onClose, onSaved, initialData = null }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await categoryService.getCategories();
        if (cats && cats.length > 0) {
          setCategories(cats.map(c => c.name));
        }
      } catch (e) {
        // use default fallback
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setDescription(initialData.description || '');
      setCategory(initialData.category || 'Food');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setMerchant(initialData.merchant || '');
      setPaymentMethod(initialData.payment_method || 'UPI');
    } else {
      setAmount('');
      setDescription('');
      setCategory('Food');
      setDate(new Date().toISOString().split('T')[0]);
      setMerchant('');
      setPaymentMethod('UPI');
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description for this expense.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      amount: numAmount,
      description: description.trim(),
      category,
      date,
      merchant: merchant.trim() || null,
      payment_method: paymentMethod,
    };

    try {
      if (initialData && initialData.id) {
        await expenseService.updateExpense(initialData.id, payload);
      } else {
        await expenseService.createExpense(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.detail || 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
            {initialData?.id ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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

          {/* Amount in INR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
              Amount in Rupees (₹) *
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
                step="0.01"
                min="0.01"
                required
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '1.1rem', fontWeight: '600' }}
                placeholder="450.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
              Description *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Weekly Groceries, Reliance Fresh"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category & Payment Method in a 2-col row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
                Category *
              </label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
                Payment Method *
              </label>
              <select
                className="form-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm} style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Merchant in a 2-col row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
                Date *
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>
                Merchant / Vendor
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Amazon, Uber, Blinkit"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-netflix" disabled={loading}>
              {loading ? 'Saving...' : initialData?.id ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
