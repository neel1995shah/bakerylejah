import React, { useEffect, useState } from 'react';
import apiClient from '../config/api';
import { filterByScope } from '../utils/auth';
import { socket } from '../utils/socket';
import '../styles/Dashboard.css';

const Ledger = ({ token, username }) => {
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
    name: '',
    in: '',
    out: ''
  });
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const savedAccounts = localStorage.getItem('gamdom-accounts');
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed)) {
          setAccounts(parsed.filter((acc) => acc.isActive));
        }
      } catch (e) {}
    }
  }, []);

  const activeAccounts = accounts.filter((acc) => acc.isActive);
  const handlerSuggestions = [...new Set(activeAccounts.map((acc) => acc.handler).filter(Boolean))];

  const fetchEntries = async () => {
    const response = await apiClient.get('/api/ledger-entries');
    const allEntries = response.data || [];
    const visibleEntries = filterByScope(allEntries, username, 'name');

    let currentTotal = 0;
    const recalculatedEntries = visibleEntries
      .slice()
      .reverse()
      .map((entry) => {
        currentTotal += Number(entry.in || 0) - Number(entry.out || 0);
        return { ...entry, total: currentTotal };
      })
      .reverse();

    setEntries(recalculatedEntries);
  };

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        await fetchEntries();
      } catch (err) {
        console.error('Error fetching ledger entries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
    socket.on('realtime-update', fetchEntries);

    return () => {
      socket.off('realtime-update', fetchEntries);
    };
  }, [token, username]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [entries.length, currentPage]);

  const filteredEntries = entries.filter((entry) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const dateText = new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return [entry.name, entry.in, entry.out, entry.total, dateText, entry.settled ? 'settled' : 'open']
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const sortedEntries = [...filteredEntries].sort((left, right) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(left.date) - new Date(right.date);
      case 'name-asc':
        return (left.name || '').localeCompare(right.name || '');
      case 'name-desc':
        return (right.name || '').localeCompare(left.name || '');
      case 'total-asc':
        return Number(left.total || 0) - Number(right.total || 0);
      case 'total-desc':
        return Number(right.total || 0) - Number(left.total || 0);
      case 'date-desc':
      default:
        return new Date(right.date) - new Date(left.date);
    }
  });

  const paginatedEntries = sortedEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startItem = sortedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, sortedEntries.length);
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));

  const filteredChronologicalEntries = [...filteredEntries].sort((left, right) => new Date(left.date) - new Date(right.date));
  let runningBalance = 0;
  filteredChronologicalEntries.forEach((entry) => {
    runningBalance += Number(entry.in || 0) - Number(entry.out || 0);
  });
  const filteredTotalBalance = runningBalance;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const selectedAccount = activeAccounts.find((account) => account.handler === value);
      if (selectedAccount) {
        setFormData((prev) => ({ ...prev, name: value }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const payload = {
        ...formData,
        in: Number(formData.in || 0),
        out: Number(formData.out || 0)
      };

      if (editingEntryId) {
        await apiClient.put(`/api/ledger-entries/${editingEntryId}`, payload);
      } else {
        await apiClient.post('/api/ledger-entries', payload);
      }

      await fetchEntries();
      setShowForm(false);
      setEditingEntryId(null);
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        name: '',
        in: '',
        out: ''
      });
      setMessage(editingEntryId ? 'Transaction updated successfully.' : 'Transaction added successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || (editingEntryId ? 'Failed to update transaction.' : 'Failed to add transaction.'));
    }
  };

  const handleOpenCreate = () => {
    setMessage('');
    setEditingEntryId(null);
    setCurrentPage(1);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      name: '',
      in: '',
      out: ''
    });
    setShowForm(true);
  };

  const handleOpenEdit = (entry) => {
    setMessage('');
    if (entry.settled || Number(entry.editCount || 0) >= 1) {
      setMessage(entry.settled ? 'Settled entries cannot be edited.' : 'This entry can only be edited once.');
      return;
    }

    setEditingEntryId(entry._id);
    setFormData({
      date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      name: entry.name || '',
      in: entry.in ?? '',
      out: entry.out ?? ''
    });
    setShowForm(true);
  };

  const handleSettle = async (entryId) => {
    setMessage('');

    try {
      await apiClient.put(`/api/ledger-entries/${entryId}/settle`);
      await fetchEntries();
      setMessage('Entry settled successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to settle entry.');
    }
  };

  if (loading) return <div>Loading ledger...</div>;

  return (
    <div className="dashboard-container">
      <h1>Ledger</h1>

      <div className="pl-toolbar">
        <button className="pl-add-btn" onClick={handleOpenCreate}>Add Transaction</button>
      </div>

      <div className="table-filters">
        <div className="form-group filter-group">
          <label htmlFor="ledger-search">Search</label>
          <input
            id="ledger-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setCurrentPage(1);
              setSearchTerm(e.target.value);
            }}
            placeholder="Search name, amount, date, status"
          />
        </div>
        <div className="form-group filter-group">
          <label htmlFor="ledger-sort">Sort By</label>
          <select
            id="ledger-sort"
            value={sortBy}
            onChange={(e) => {
              setCurrentPage(1);
              setSortBy(e.target.value);
            }}
          >
            <option value="date-desc">Date Newest</option>
            <option value="date-asc">Date Oldest</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="total-desc">Total High-Low</option>
            <option value="total-asc">Total Low-High</option>
          </select>
        </div>
      </div>

      {message && <div className={message.includes('successfully') ? 'success-message' : 'error-message'}>{message}</div>}

      <div className="table-container">
        <table className="ledger-table ledger-view-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>In</th>
              <th>Out</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="pl-total-row">
              <td colSpan="4"><strong>Current Total</strong></td>
              <td className={filteredTotalBalance >= 0 ? 'income-text' : 'expense-text'}>
                <strong>{Number(filteredTotalBalance || 0).toFixed(3).replace(/\.?0+$/, '')}</strong>
              </td>
              <td />
              <td />
            </tr>
            {sortedEntries.length > 0 ? (
              paginatedEntries.map((entry) => (
                <tr key={entry._id} className={entry.settled ? 'account-row-inactive' : ''}>
                  <td>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td>{entry.name}</td>
                  <td>{Number(entry.in || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td>{Number(entry.out || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td className={entry.total >= 0 ? 'income-text' : 'expense-text'}>
                    {Number(entry.total || 0).toFixed(3).replace(/\.?0+$/, '')}
                  </td>
                  <td>
                    <span className={`status-chip ${entry.settled ? 'inactive' : 'active'}`}>
                      {entry.settled ? 'Settled' : 'Open'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleOpenEdit(entry)}
                      disabled={entry.settled || Number(entry.editCount || 0) >= 1}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleSettle(entry._id)}
                      disabled={entry.settled}
                    >
                      Settle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">No ledger transactions match the current search.</td>
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
            <h2>{editingEntryId ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="name">Name (Handler)</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter or select handler"
                  list="ledger-handler-suggestions"
                  required
                />
              </div>

              <datalist id="ledger-handler-suggestions">
                {handlerSuggestions.map((handlerName) => (
                  <option key={handlerName} value={handlerName} />
                ))}
              </datalist>

              <div className="form-group">
                <label htmlFor="in">In</label>
                <input id="in" type="number" name="in" value={formData.in} onChange={handleChange} min="0" step="0.001" />
              </div>

              <div className="form-group">
                <label htmlFor="out">Out</label>
                <input id="out" type="number" name="out" value={formData.out} onChange={handleChange} min="0" step="0.001" />
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

export default Ledger;
