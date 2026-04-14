import React, { useState, useEffect } from 'react';
import apiClient from '../config/api';
import { filterByScope, isFirmMember } from '../utils/auth';
import { socket } from '../utils/socket';
import '../styles/Dashboard.css';

const Dashboard = ({ token, username }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ in: 0, out: 0, charges: 0, netProfit: 0, ledgerBalance: 0 });
  const [accountStats, setAccountStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [plResponse, ledgerResponse] = await Promise.all([
          apiClient.get('/api/pl-entries'),
          apiClient.get('/api/ledger-entries')
        ]);
        
        const plEntries = plResponse.data.entries || [];
        const ledgerEntries = ledgerResponse.data || [];

        // Scope filter the entries down securely based on logged in username
        const visiblePlEntries = filterByScope(plEntries, username, 'handler');
        const visibleLedgerEntries = filterByScope(ledgerEntries, username, 'name');

        const scopedStats = { in: 0, out: 0, charges: 0, netProfit: 0, ledgerBalance: 0 };

        visiblePlEntries.forEach(entry => {
          const inVal = Number(entry.in || 0);
          const outVal = Number(entry.out || 0);
          const chgVal = Number(entry.charges || 0);
          
          scopedStats.in += inVal;
          scopedStats.out += outVal;
          scopedStats.charges += chgVal;
          scopedStats.netProfit += Number(entry.netProfit || (inVal - outVal - chgVal));
        });

        visibleLedgerEntries.forEach(entry => {
          const inVal = Number(entry.in || 0);
          const outVal = Number(entry.out || 0);
          scopedStats.ledgerBalance += (inVal - outVal);
        });

        setDashboardStats(scopedStats);

        // Fetch Accounts from Local Storage and explicitly scope them as well
        const savedAccounts = localStorage.getItem('gamdom-accounts');
        let total = 0, active = 0, inactive = 0;
        
        if (savedAccounts) {
          try {
            const parsed = JSON.parse(savedAccounts);
            if (Array.isArray(parsed)) {
              const visibleAccounts = filterByScope(parsed, username, 'handler');
              total = visibleAccounts.length;
              active = visibleAccounts.filter(acc => acc.isActive).length;
              inactive = total - active;
            }
          } catch (e) {
            console.error('Error parsing accounts', e);
          }
        }
        setAccountStats({ total, active, inactive });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
      socket.on('realtime-update', fetchDashboardData);
    }

    return () => {
      socket.off('realtime-update', fetchDashboardData);
    };
  }, [token, username]);

  if (loading) return <div className="dashboard-container">Loading dashboard...</div>;

  const titlePrefix = isFirmMember(username) ? 'Firm' : (username || 'User');

  return (
    <div className="dashboard-container">
      <h1 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>{titlePrefix} Dashboard</h1>
      
      <div className="pl-cards">
        <div className="card income">
          <h3>Total Revenue (In)</h3>
          <p className="amount">{(dashboardStats.in || 0).toFixed(2).replace(/\.00$/, '')}</p>
        </div>
        <div className={`card profit ${(dashboardStats.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
          <h3>Net Profit</h3>
          <p className="amount">{(dashboardStats.netProfit || 0).toFixed(2).replace(/\.00$/, '')}</p>
        </div>
        <div className={`card ${(dashboardStats.ledgerBalance || 0) >= 0 ? 'income' : 'expense'}`}>
          <h3>Ledger Balance</h3>
          <p className="amount">{(dashboardStats.ledgerBalance || 0).toFixed(3).replace(/\.?0+$/, '')}</p>
        </div>
        <div className="card">
          <h3>Total Expenses</h3>
          <p className="amount" style={{color: '#c53030'}}>
            {((dashboardStats.out || 0) + (dashboardStats.charges || 0)).toFixed(2).replace(/\.00$/, '')}
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: '2.5rem' }}>Accounts Overview</h2>
      <div className="pl-cards">
        <div className="card">
          <h3>Total Accounts</h3>
          <p className="amount" style={{color: '#2d3748'}}>{accountStats.total}</p>
        </div>
        <div className="card income">
          <h3>Active Accounts</h3>
          <p className="amount">{accountStats.active}</p>
        </div>
        <div className="card expense">
          <h3>Inactive Accounts</h3>
          <p className="amount">{accountStats.inactive}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
