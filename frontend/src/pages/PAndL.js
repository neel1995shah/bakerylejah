import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../config/api';
import { socket } from '../utils/socket';
import '../styles/Dashboard.css';

const PAndL = ({ token, username }) => {
  const PAGE_SIZE = 50;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    handler: username || '',
    acc: '',
    bet: '',
    win: '',
    charges: ''
  });
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const savedAccounts = localStorage.getItem('gamdom-accounts');
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed)) {
          setAccounts(parsed.filter(acc => acc.isActive));
        }
      } catch (e) {}
    }
  }, []);

  const activeAccounts = accounts.filter(acc => acc.isActive);
  const handlerSuggestions = [...new Set(activeAccounts.map(acc => acc.handler).filter(Boolean))];
  const accountSuggestions = [...new Set(
    activeAccounts
      .map(acc => acc.accountName || acc.accountId)
      .filter(Boolean)
  )];

  const fetchEntries = useCallback(async () => {
    const response = await apiClient.get('/api/pl-entries');
    const visibleEntries = response.data.entries || [];

    setEntries(visibleEntries);
  }, []);

  useEffect(() => {
    const fetchPLData = async () => {
      try {
        await fetchEntries();
      } catch (err) {
        console.error('Error fetching P&L data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPLData();

    socket.on('realtime-update', fetchEntries);
    return () => {
      socket.off('realtime-update', fetchEntries);
    };
  }, [token, fetchEntries]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [entries.length, currentPage]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, handler: prev.handler || username || '' }));
  }, [username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'acc') {
      const selectedAccount = activeAccounts.find(a => (a.accountName || a.accountId) === value);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          acc: value,
          handler: selectedAccount.handler
        }));
      } else {
        setFormData(prev => ({ ...prev, acc: value }));
      }
    } else if (name === 'handler') {
      const selectedAccount = activeAccounts.find(a => a.handler === value);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          handler: value,
          acc: selectedAccount.accountName || selectedAccount.accountId
        }));
      } else {
        setFormData(prev => ({ ...prev, handler: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const payload = {
        date: formData.date,
        handler: formData.handler,
        acc: formData.acc,
        in: Number(formData.bet || 0),
        out: Number(formData.win || 0),
        charges: Number(formData.charges || 0)
      };

      if (editingEntryId) {
        await apiClient.put(`/api/pl-entries/${editingEntryId}`, payload);
      } else {
        await apiClient.post('/api/pl-entries', payload);
      }

      await fetchEntries();
      setShowForm(false);
      setEditingEntryId(null);
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        handler: username || '',
        acc: '',
        bet: '',
        win: '',
        charges: ''
      });
      setMessage(editingEntryId ? 'P&L entry updated successfully.' : 'P&L entry added successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || (editingEntryId ? 'Failed to update P&L entry.' : 'Failed to add P&L entry.'));
    }
  };

  const handleOpenCreate = () => {
    setMessage('');
    setEditingEntryId(null);
    setCurrentPage(1);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      handler: username || '',
      acc: '',
      bet: '',
      win: '',
      charges: ''
    });
    setShowForm(true);
  };

  const handleOpenEdit = (row) => {
    setMessage('');
    if (row.settled) {
      setMessage('Settled entries cannot be edited.');
      return;
    }
    setEditingEntryId(row._id);
    setFormData({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      handler: row.handler || '',
      acc: row.acc || '',
      bet: row.in ?? '',
      win: row.out ?? '',
      charges: row.charges ?? ''
    });
    setShowForm(true);
  };

  const handleSettle = async (entryId) => {
    setMessage('');

    try {
      await apiClient.put(`/api/pl-entries/${entryId}/settle`);
      await fetchEntries();
      setMessage('P&L entry settled successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to settle P&L entry.');
    }
  };

  const handleDelete = async (entryId) => {
    setMessage('');

    const shouldDelete = window.confirm('Delete this P&L entry? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    try {
      await apiClient.delete(`/api/pl-entries/${entryId}`);
      await fetchEntries();
      setMessage('P&L entry deleted successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete P&L entry.');
    }
  };

  const filteredEntries = entries.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const dateText = new Date(row.date).toLocaleDateString('en-GB');
    return [row.entryCode, row.handler, row.acc, row.in, row.out, row.charges, row.netProfit, dateText, row.settled ? 'settled' : 'open']
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const sortedEntries = [...filteredEntries].sort((left, right) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(left.date) - new Date(right.date);
      case 'handler-asc':
        return (left.handler || '').localeCompare(right.handler || '');
      case 'handler-desc':
        return (right.handler || '').localeCompare(left.handler || '');
      case 'profit-asc':
        return Number(left.netProfit || 0) - Number(right.netProfit || 0);
      case 'profit-desc':
        return Number(right.netProfit || 0) - Number(left.netProfit || 0);
      case 'date-desc':
      default:
        return new Date(right.date) - new Date(left.date);
    }
  });

  const filteredTotals = sortedEntries.reduce((acc, row) => {
    const inVal = Number(row.in || 0);
    const outVal = Number(row.out || 0);
    const chgVal = Number(row.charges || 0);
    acc.totalIn += inVal;
    acc.totalOut += outVal;
    acc.totalCharges += chgVal;
    acc.totalNetProfit += Number(row.netProfit || (inVal - outVal - chgVal));
    return acc;
  }, { totalIn: 0, totalOut: 0, totalCharges: 0, totalNetProfit: 0 });

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startItem = sortedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, sortedEntries.length);

  if (loading) return <div>Loading P&L data...</div>;

  return (
    <div className="dashboard-container">
      <h1>Profit & Loss Statement</h1>

      <div className="pl-toolbar">
        <button className="pl-add-btn" onClick={handleOpenCreate}>Add Data</button>
      </div>

      <div className="table-filters">
        <div className="form-group filter-group">
          <label htmlFor="pl-search">Search</label>
          <input
            id="pl-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setCurrentPage(1);
              setSearchTerm(e.target.value);
            }}
            placeholder="Search index, handler, acc, amount, date"
          />
        </div>
        <div className="form-group filter-group">
          <label htmlFor="pl-sort">Sort By</label>
          <select
            id="pl-sort"
            value={sortBy}
            onChange={(e) => {
              setCurrentPage(1);
              setSortBy(e.target.value);
            }}
          >
            <option value="date-desc">Date Newest</option>
            <option value="date-asc">Date Oldest</option>
            <option value="handler-asc">Handler A-Z</option>
            <option value="handler-desc">Handler Z-A</option>
            <option value="profit-desc">Profit High-Low</option>
            <option value="profit-asc">Profit Low-High</option>
          </select>
        </div>
      </div>

      {message && <div className={message.includes('successfully') ? 'success-message' : 'error-message'}>{message}</div>}

      <div className="table-container">
        <table className="ledger-table pl-table">
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
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="pl-total-row">
              <td colSpan="4"><strong>Total</strong></td>
              <td><strong>{filteredTotals.totalIn.toFixed(2)}</strong></td>
              <td><strong>{filteredTotals.totalOut.toFixed(2)}</strong></td>
              <td><strong>{filteredTotals.totalCharges.toFixed(2)}</strong></td>
              <td className={filteredTotals.totalNetProfit >= 0 ? 'income-text' : 'expense-text'}>
                <strong>{filteredTotals.totalNetProfit.toFixed(2)}</strong>
              </td>
              <td />
              <td />
            </tr>
            {sortedEntries.length > 0 ? (
              paginatedEntries.map((row) => (
                <tr key={row._id} className={row.settled ? 'account-row-inactive' : ''}>
                  <td>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                  <td>{row.entryCode || '-'}</td>
                  <td>{row.handler}</td>
                  <td>{row.acc}</td>
                  <td>{row.in || 0}</td>
                  <td>{row.out || 0}</td>
                  <td>{row.charges || 0}</td>
                  <td className={row.netProfit >= 0 ? 'income-text' : 'expense-text'}>{row.netProfit || 0}</td>
                  <td>
                    <span className={`status-chip ${row.settled ? 'inactive' : 'active'}`}>
                      {row.settled ? 'Settled' : 'Open'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleOpenEdit(row)}
                      disabled={row.settled}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleSettle(row._id)}
                      disabled={row.settled}
                    >
                      Settle
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDelete(row._id)}
                      disabled={row.settled}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="no-data">No P&L rows match the current search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sortedEntries.length > PAGE_SIZE && (
        <div className="pagination-bar">
          <div className="pagination-summary">
            Showing {startItem}-{endItem} of {sortedEntries.length}
          </div>
          <div className="pagination-controls">
            <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              First
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="pagination-page">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="pl-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="pl-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEntryId ? 'Edit P&L Data' : 'Add P&L Data'}</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="handler">Handler (Name)</label>
                <input
                  id="handler"
                  type="text"
                  name="handler"
                  value={formData.handler}
                  onChange={handleChange}
                  placeholder="Enter or select handler"
                  list="pl-handler-suggestions"
                  required
                />
              </div>

              <datalist id="pl-handler-suggestions">
                {handlerSuggestions.map((handlerName) => (
                  <option key={handlerName} value={handlerName} />
                ))}
              </datalist>

              <div className="form-group">
                <label htmlFor="acc">Acc (Name / ID)</label>
                <input
                  id="acc"
                  type="text"
                  name="acc"
                  value={formData.acc}
                  onChange={handleChange}
                  placeholder="Enter or select account"
                  list="pl-account-suggestions"
                  required
                />
              </div>

              <datalist id="pl-account-suggestions">
                {accountSuggestions.map((accountName) => (
                  <option key={accountName} value={accountName} />
                ))}
              </datalist>

              <div className="form-group">
                <label htmlFor="bet">Bet</label>
                <input id="bet" type="number" name="bet" value={formData.bet} onChange={handleChange} min="0" step="0.01" />
              </div>

              <div className="form-group">
                <label htmlFor="win">Win</label>
                <input id="win" type="number" name="win" value={formData.win} onChange={handleChange} min="0" step="0.01" />
              </div>

              <div className="form-group">
                <label htmlFor="charges">Charges</label>
                <input id="charges" type="number" name="charges" value={formData.charges} onChange={handleChange} min="0" step="0.01" />
              </div>

              <div className="pl-modal-actions">
                <button type="button" className="pl-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="pl-save-btn">{editingEntryId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PAndL;
