import React, { useState, useEffect } from 'react';
import { expenseService, categoryService } from '../services/api';
import { formatINR, formatDate } from '../utils/formatters';
import ExpenseFormModal from '../components/ExpenseFormModal';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import {
  Search,
  Filter,
  Download,
  Plus,
  Scan,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CreditCard,
  Tag
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  "All", "Food", "Groceries", "Restaurants", "Transport", "Entertainment",
  "Bills & Utilities", "Shopping", "Healthcare", "Education", "Rent",
  "Travel", "Personal Care", "Other"
];

const PAYMENT_METHODS = ["All", "UPI", "Cash", "Credit Card", "Debit Card", "Net Banking"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState('₹0.00');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await categoryService.getCategories();
        if (cats && cats.length > 0) {
          const names = ['All', ...cats.map(c => c.name)];
          setCategoriesList(names);
        }
      } catch (e) {
        // use fallback
      }
    }
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
      };
      if (search.trim()) params.search = search.trim();
      if (category && category !== 'All') params.category = category;
      if (paymentMethod && paymentMethod !== 'All') params.payment_method = paymentMethod;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await expenseService.getExpenses(params);
      setExpenses(res.items);
      setTotalCount(res.total);
      setTotalPages(res.total_pages);
      setTotalAmount(res.formatted_total_amount);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, pageSize, category, paymentMethod, startDate, endDate, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchExpenses();
  };

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category && category !== 'All') params.category = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const blob = await expenseService.exportCSV(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `flixpense_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('CSV Export failed', e);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense? This cannot be undone.')) {
      try {
        await expenseService.deleteExpense(id);
        fetchExpenses();
      } catch (e) {
        console.error('Delete failed', e);
      }
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setPaymentMethod('All');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
    setPage(1);
  };

  return (
    <div className="container" style={{ padding: '2rem 0 4rem 0' }}>
      {/* Title & Top Action Buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Expenses Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Showing {totalCount} transactions totaling <strong style={{ color: '#fff' }}>{totalAmount}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn-secondary" title="Export filtered records to CSV">
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button onClick={() => setIsScannerOpen(true)} className="btn-secondary">
            <Scan size={16} color="var(--netflix-red)" />
            <span>Scan Receipt</span>
          </button>

          <button
            onClick={() => {
              setEditingExpense(null);
              setIsFormOpen(true);
            }}
            className="btn-netflix"
          >
            <Plus size={18} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="netflix-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="#737373" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search description, merchant..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Category Dropdown */}
          <div style={{ flex: '0 1 170px' }}>
            <select
              className="form-input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              style={{ height: '40px', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              {categoriesList.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div style={{ flex: '0 1 150px' }}>
            <select
              className="form-input"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              style={{ height: '40px', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm} style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>
                  {pm === 'All' ? 'All Payments' : pm}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div style={{ flex: '0 1 140px' }}>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{ height: '40px', fontSize: '0.85rem' }}
              title="Filter from date"
            />
          </div>

          {/* End Date */}
          <div style={{ flex: '0 1 140px' }}>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{ height: '40px', fontSize: '0.85rem' }}
              title="Filter to date"
            />
          </div>

          {/* Sort */}
          <div style={{ flex: '0 1 160px' }}>
            <select
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ height: '40px', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <option value="date_desc" style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>Date: Newest First</option>
              <option value="date_asc" style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>Date: Oldest First</option>
              <option value="amount_desc" style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>Amount: Highest First</option>
              <option value="amount_asc" style={{ backgroundColor: 'var(--netflix-dark)', color: '#fff' }}>Amount: Lowest First</option>
            </select>
          </div>

          <button type="submit" className="btn-netflix" style={{ height: '40px', padding: '0 1rem', fontSize: '0.88rem' }}>
            Search
          </button>

          {(search || category !== 'All' || paymentMethod !== 'All' || startDate || endDate) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ height: '40px', padding: '0 0.85rem', fontSize: '0.82rem' }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Expenses Table */}
      <div className="netflix-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                color: 'var(--text-secondary)'
              }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Description</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Category</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Merchant</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>Payment</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textAlign: 'right' }}>Amount (INR)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No expenses matched the current filters.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDate(exp.date)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#fff' }}>
                      {exp.description}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="badge badge-red" style={{ fontSize: '0.78rem' }}>
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {exp.merchant || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem'
                      }}>
                        {exp.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: '700', color: '#fff', fontSize: '0.98rem' }}>
                      {exp.formatted_amount}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsFormOpen(true);
                          }}
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Edit Expense"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Delete Expense"
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages} ({totalCount} items)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchExpenses}
        initialData={editingExpense}
      />

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onExpenseCreated={fetchExpenses}
      />
    </div>
  );
}
