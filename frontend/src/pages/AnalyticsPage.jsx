import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/api';
import {
  CategoryPieChart,
  SpendingTrendChart,
  MonthlyComparisonBarChart,
  TopMerchantsList
} from '../components/AnalyticsCharts';
import { formatINR } from '../utils/formatters';
import { TrendingUp, BarChart2, PieChart, Store, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await analyticsService.getDashboard();
        setData(res);
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading financial analytics...
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="container" style={{ padding: '2rem 0 4rem 0' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
          Spending Analytics &amp; Insights
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Historical trends, category share distributions, and Month-over-Month comparisons
        </p>
      </div>

      {/* Row 1: 6-Month Comparison & 30-Day Trend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* 6-Month Bar Chart */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
                Monthly Spending Comparison
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last 6 months in INR (₹)</p>
            </div>
            <BarChart2 size={20} color="var(--netflix-red)" />
          </div>
          <MonthlyComparisonBarChart data={data?.monthly_comparison} />
        </div>

        {/* 30-Day Trend Area Chart */}
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
                Daily Spending Trajectory
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last 30 days continuous trajectory</p>
            </div>
            <TrendingUp size={20} color="var(--netflix-red)" />
          </div>
          <SpendingTrendChart data={data?.spending_trends} />
        </div>
      </div>

      {/* Row 2: Category Breakdown Donut & Category Details Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div className="netflix-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
              Category Distribution
            </h3>
            <PieChart size={20} color="var(--netflix-red)" />
          </div>
          <CategoryPieChart data={data?.category_breakdown} />
        </div>

        {/* Category Ranked Breakdown Table */}
        <div className="netflix-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
            Category Spending Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {(!data?.category_breakdown || data.category_breakdown.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>
                No category data for current month
              </p>
            ) : (
              data.category_breakdown.map((cat, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.88rem' }}>{cat.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{cat.formatted_amount}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cat.percentage}% ({cat.count} txns)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Top Merchants */}
      <div className="netflix-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
              Top Merchant Concentration
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Highest spending vendors this month</p>
          </div>
          <Store size={20} color="var(--netflix-red)" />
        </div>
        <TopMerchantsList merchants={data?.top_merchants} totalAmount={summary?.total_this_month || 0} />
      </div>
    </div>
  );
}
