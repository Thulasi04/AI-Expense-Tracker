import React, { useState, useEffect } from 'react';
import { analyticsService, expenseService } from '../services/api';
import { formatINR, formatDate } from '../utils/formatters';
import StatCard from '../components/StatCard';
import {
  CategoryPieChart,
  SpendingTrendChart,
  TopMerchantsList
} from '../components/AnalyticsCharts';
import ExpenseFormModal from '../components/ExpenseFormModal';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import BudgetModal from '../components/BudgetModal';
import {
  Plus,
  Scan,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Calendar,
  Wallet,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2
} from 'lucide-react';

export default function Dashboard({ onOpenChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseService.deleteExpense(id);
        fetchDashboardData();
      } catch (e) {
        console.error('Failed to delete expense', e);
      }
    }
  };

  if (loading && !data) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading your financial dashboard...
      </div>
    );
  }

  const summary = data?.summary || {
    total_this_month: 0,
    formatted_this_month: '₹0.00',
    total_last_month: 0,
    formatted_last_month: '₹0.00',
    mom_percentage_change: 0,
    mom_change_type: 'flat',
    total_today: 0,
    formatted_today: '₹0.00',
    monthly_budget: 0,
    formatted_monthly_budget: '₹0.00',
    remaining_budget: 0,
    formatted_remaining_budget: '₹0.00',
    budget_used_percentage: 0
  };

  return (
    <div className="container" style={{ padding: '2rem 0 4rem 0' }}>
      {/* Top Welcome & Action Header */}
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
            Financial Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track, analyze and optimize your expenses in Indian Rupees (₹)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="btn-secondary"
            title="Scan physical bill using OCR"
          >
            <Scan size={17} color="var(--netflix-red)" />
            <span>Scan Receipt</span>
          </button>

          <button
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            className="btn-netflix"
          >
            <Plus size={18} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* AI Assistant Callout Banner */}
      <div style={{
        backgroundColor: 'rgba(229, 9, 20, 0.08)',
        border: '1px solid rgba(229, 9, 20, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--netflix-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--netflix-red-glow)'
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
              Conversational Financial AI Ready
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              Say "Add coffee ₹120, lunch ₹250 and Uber ₹180 today" or "Compare this month with last month".
            </p>
          </div>
        </div>

        <button
          onClick={onOpenChat}
          className="btn-netflix"
          style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
        >
          <span>Open AI Chat</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="Spent This Month"
          amount={summary.formatted_this_month}
          change={summary.mom_percentage_change}
          changeType={summary.mom_change_type}
          subtitle="vs last month"
          icon={Receipt}
        />

        <StatCard
          title="Spent Last Month"
          amount={summary.formatted_last_month}
          subtitle="Previous calendar month"
          icon={Calendar}
        />

        <StatCard
          title="Spent Today"
          amount={summary.formatted_today}
          subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
          icon={TrendingUp}
        />

        <StatCard
          title="Remaining Budget"
          amount={summary.monthly_budget > 0 ? summary.formatted_remaining_budget : 'No Budget Set'}
          subtitle={summary.monthly_budget > 0 ? `${summary.budget_used_percentage}% used of ${summary.formatted_monthly_budget}` : 'Set monthly limit'}
          icon={Wallet}
          progress={summary.monthly_budget > 0 ? summary.budget_used_percentage : null}
          badgeText={summary.budget_used_percentage >= 100 ? 'Over Budget' : (summary.budget_used_percentage >= 80 ? 'Warning (80%+)' : null)}
          badgeType={summary.budget_used_percentage >= 100 ? 'red' : 'amber'}
        />
      </div>

      {/* Charts Section: 30-Day Trend & Category Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Spending Trend Line/Area */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
              Spending Trend (Last 30 Days)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily INR</span>
          </div>
          <SpendingTrendChart data={data?.spending_trends} />
        </div>

        {/* Category Breakdown Donut */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
              Category Breakdown
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This Month</span>
          </div>
          <CategoryPieChart data={data?.category_breakdown} />
        </div>
      </div>

      {/* Row 2: Top Merchants & Recent Transactions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Top Merchants */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
              Top Merchants
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Top 5</span>
          </div>
          <TopMerchantsList
            merchants={data?.top_merchants}
            totalAmount={summary.total_this_month}
          />
        </div>

        {/* Recent Transactions */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
              Recent Transactions
            </h3>
            <a href="/expenses" style={{ fontSize: '0.82rem', color: 'var(--netflix-red)', fontWeight: '600' }}>
              View All →
            </a>
          </div>

          {(!data?.recent_expenses || data.recent_expenses.length === 0) ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No expenses recorded yet. Click "+ Add Expense" or use AI Assistant!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.recent_expenses.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.92rem' }}>
                      {exp.description}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {exp.category} • {formatDate(exp.date)} {exp.merchant ? `• ${exp.merchant}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>
                      {exp.formatted_amount}
                    </span>
                    <button
                      onClick={() => {
                        setEditingExpense(exp);
                        setIsExpenseModalOpen(true);
                      }}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="Delete"
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaved={fetchDashboardData}
        initialData={editingExpense}
      />

      <ReceiptScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onExpenseCreated={fetchDashboardData}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSaved={fetchDashboardData}
      />
    </div>
  );
}
