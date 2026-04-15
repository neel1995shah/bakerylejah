import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../config/api';
import '../styles/Dashboard.css';

const Crypto = ({ token }) => {
  const [accountName, setAccountName] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [accountSuggestions, setAccountSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState('');
  const [message, setMessage] = useState('');

  const fetchAccounts = useCallback(async () => {
    const response = await apiClient.get('/api/accounts');
    const names = (response.data || [])
      .map((account) => account.accountName || account.accountId)
      .filter(Boolean);
    setAccountSuggestions(Array.from(new Set(names)).sort((left, right) => left.localeCompare(right)));
  }, []);

  const fetchCryptoRows = useCallback(async (query = '') => {
    const response = await apiClient.get('/api/crypto', {
      params: query ? { accountName: query } : {}
    });
    setRows(response.data || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchAccounts(), fetchCryptoRows()]);
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load crypto addresses.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    }
  }, [token, fetchAccounts, fetchCryptoRows]);

  useEffect(() => {
    const loadSearchResults = async () => {
      try {
        if (!searchTerm.trim()) {
          await fetchCryptoRows();
          return;
        }

        await fetchCryptoRows(searchTerm.trim());
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to search crypto addresses.');
      }
    };

    if (token) {
      loadSearchResults();
    }
  }, [searchTerm, token, fetchCryptoRows]);

  const filteredRows = rows;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);

    try {
      await apiClient.post('/api/crypto', {
        accountName: accountName.trim(),
        cryptoAddress: cryptoAddress.trim()
      });
      setAccountName('');
      setCryptoAddress('');
      await fetchCryptoRows(searchTerm.trim());
      setMessage('Crypto address saved successfully.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save crypto address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setMessage('');

    try {
      await apiClient.delete(`/api/crypto/${id}`);
      await fetchCryptoRows(searchTerm.trim());
      setMessage('Crypto address deleted successfully.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete crypto address.');
    }
  };

  const handleCopy = async (row) => {
    setMessage('');

    try {
      await navigator.clipboard.writeText(row.cryptoAddress);
      setCopiedRowId(row._id);
      setTimeout(() => setCopiedRowId(''), 1500);
      setMessage('Crypto address copied to clipboard.');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('Failed to copy crypto address.');
    }
  };

  if (loading) {
    return <div className="dashboard-container">Loading crypto page...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Crypto Addresses</h1>

      <div className="pl-toolbar">
        <p style={{ margin: 0, color: '#516079' }}>
          Save a crypto address against an account name and search it instantly.
        </p>
      </div>

      <div className="table-filters">
        <div className="form-group filter-group">
          <label htmlFor="crypto-search">Search by Account Name</label>
          <input
            id="crypto-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Type account name to show the address"
            list="crypto-account-suggestions"
          />
        </div>
      </div>

      <datalist id="crypto-account-suggestions">
        {accountSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="pl-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="pl-add-btn"
          onClick={() => setShowAddForm((current) => !current)}
        >
          {showAddForm ? 'Close Add Form' : 'Add Crypto Address'}
        </button>
      </div>

      {showAddForm && (
        <div className="table-filters" style={{ marginTop: '1rem' }}>
          <div className="form-group filter-group">
            <label htmlFor="crypto-account">Account Name</label>
            <input
              id="crypto-account"
              type="text"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Enter account name"
              list="crypto-account-suggestions"
            />
          </div>
          <div className="form-group filter-group">
            <label htmlFor="crypto-address">Crypto Address</label>
            <input
              id="crypto-address"
              type="text"
              value={cryptoAddress}
              onChange={(event) => setCryptoAddress(event.target.value)}
              placeholder="Enter wallet address"
            />
          </div>
          <div className="pl-toolbar" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="pl-add-btn" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Data'}
            </button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <div style={{ marginTop: '0.75rem', color: '#516079' }}>
          Click <strong>Add Crypto Address</strong> to add or update a saved address.
        </div>
      )}

      {message && <div className={message.includes('successfully') ? 'success-message' : 'error-message'}>{message}</div>}

      <div className="table-container">
        <table className="ledger-table accounts-table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Crypto Address</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="3" className="no-data">
                  {searchTerm.trim() ? 'No crypto address found for that account name.' : 'No crypto addresses added yet.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row._id}>
                  <td>{row.accountName}</td>
                  <td style={{ wordBreak: 'break-all' }}>{row.cryptoAddress}</td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleCopy(row)}
                      style={{ marginRight: '8px' }}
                    >
                      {copiedRowId === row._id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDelete(row._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Crypto;
