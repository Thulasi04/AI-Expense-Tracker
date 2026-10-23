import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { formatINR } from '../utils/formatters';

// Custom Tooltip for Dark Theme
const DarkTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        backgroundColor: '#181818',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '0.6rem 0.9rem',
        borderRadius: '6px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6)'
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2px' }}>
          {label || data.name}
        </p>
        <p style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '0.95rem' }}>
          {formatINR(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No category expenses recorded this month
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.category,
    value: item.total_amount,
    color: item.color || '#E50914'
  }));

  return (
    <div style={{ width: '100%', height: '260px' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#141414" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No spending trends recorded
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '260px' }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="netflixRedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E50914" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#E50914" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="date"
            stroke="#737373"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="#737373"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => `₹${val}`}
          />
          <Tooltip content={<DarkTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#E50914"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#netflixRedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyComparisonBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No historical months recorded
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '260px' }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="label"
            stroke="#737373"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="#737373"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => `₹${val}`}
          />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="total_amount" fill="#E50914" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopMerchantsList({ merchants, totalAmount }) {
  if (!merchants || merchants.length === 0) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        No merchant data available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {merchants.map((m, idx) => {
        const pct = totalAmount > 0 ? (m.total_amount / totalAmount) * 100 : 0;
        return (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', color: '#fff' }}>{m.merchant}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{m.formatted_amount} ({m.count}x)</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: 'var(--netflix-red)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
