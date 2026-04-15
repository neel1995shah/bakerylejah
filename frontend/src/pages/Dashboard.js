import React, { useState, useEffect } from 'react';
import apiClient from '../config/api';
import { isFirmMember } from '../utils/auth';
import { socket } from '../utils/socket';
import '../styles/Dashboard.css';

const Dashboard = ({ token, username }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ in: 0, out: 0, charges: 0, netProfit: 0, ledgerBalance: 0 });
  const [accountStats, setAccountStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [nonSettledEntries, setNonSettledEntries] = useState([]);
  const [nonSettledLedgerEntries, setNonSettledLedgerEntries] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [plResult, ledgerResult, accountsResult] = await Promise.allSettled([
          apiClient.get('/api/pl-entries'),
          apiClient.get('/api/ledger-entries'),
          apiClient.get('/api/accounts')
        ]);

        const plResponse = plResult.status === 'fulfilled' ? plResult.value : { data: { entries: [], totals: {} } };
        const ledgerResponse = ledgerResult.status === 'fulfilled' ? ledgerResult.value : { data: [] };
        const accountsResponse = accountsResult.status === 'fulfilled' ? accountsResult.value : { data: [] };

        // Backend already applies scope rules; consume scoped data directly.
        const visiblePlEntries = plResponse.data.entries || [];
        const visibleLedgerEntries = ledgerResponse.data || [];
        const plTotals = plResponse.data.totals || {};

        const nonSettledVisiblePlEntries = visiblePlEntries.filter((entry) => !entry.settled);
        const nonSettledVisibleLedgerEntries = visibleLedgerEntries.filter((entry) => !entry.settled);
        const scopedStats = {
          in: Number(plTotals.totalIn ?? 0),
          out: Number(plTotals.totalOut ?? 0),
          charges: Number(plTotals.totalCharges ?? 0),
          netProfit: Number(plTotals.totalNetProfit ?? 0),
          ledgerBalance: 0
        };

        visibleLedgerEntries.forEach(entry => {
          const inVal = Number(entry.in || 0);
          const outVal = Number(entry.out || 0);
          scopedStats.ledgerBalance += (inVal - outVal);
        });

        setDashboardStats(scopedStats);
        setNonSettledEntries(
          nonSettledVisiblePlEntries
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50)
        );
        setNonSettledLedgerEntries(
          nonSettledVisibleLedgerEntries
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50)
        );

        // Accounts are server-scoped; consume them directly.
        const scopedAccounts = accountsResponse.data || [];
        let total = 0, active = 0, inactive = 0;

        total = scopedAccounts.length;
        active = scopedAccounts.filter((account) => Boolean(account.isActive)).length;
        inactive = total - active;
        setAccountStats({ total, active, inactive });

        if (plResult.status === 'rejected' || ledgerResult.status === 'rejected' || accountsResult.status === 'rejected') {
          console.error('Dashboard partial API failure:', {
            pl: plResult.status === 'rejected' ? plResult.reason?.response?.data || plResult.reason?.message : null,
            ledger: ledgerResult.status === 'rejected' ? ledgerResult.reason?.response?.data || ledgerResult.reason?.message : null,
            accounts: accountsResult.status === 'rejected' ? accountsResult.reason?.response?.data || accountsResult.reason?.message : null
          });
        }

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

      <h2 style={{ marginTop: '2.5rem' }}>Non-Settled Ledger Entries</h2>
      <div className="table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Index</th>
              <th>Name</th>
              <th>In</th>
              <th>Out</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {nonSettledLedgerEntries.length > 0 ? (
              nonSettledLedgerEntries.map((entry) => (
                <tr key={entry._id}>
                  <td>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td>{entry.entryCode || '-'}</td>
                  <td>{entry.name}</td>
                  <td>{Number(entry.in || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td>{Number(entry.out || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td className={Number(entry.total || 0) >= 0 ? 'income-text' : 'expense-text'}>
                    {Number(entry.total || 0).toFixed(3).replace(/\.?0+$/, '')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No non-settled Ledger entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '2.5rem' }}>Non-Settled P&L Entries</h2>
      <div className="table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Index</th>
              <th>Handler</th>
              <th>Acc</th>
              <th>Bet</th>
              <th>Win</th>
              <th>Charges</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {nonSettledEntries.length > 0 ? (
              nonSettledEntries.map((entry) => (
                <tr key={entry._id}>
                  <td>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                  <td>{entry.entryCode || '-'}</td>
                  <td>{entry.handler}</td>
                  <td>{entry.acc}</td>
                  <td>{Number(entry.in || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td>{Number(entry.out || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td>{Number(entry.charges || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td className={Number(entry.netProfit || 0) >= 0 ? 'income-text' : 'expense-text'}>
                    {Number(entry.netProfit || 0).toFixed(2).replace(/\.00$/, '')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">No non-settled P&L entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
