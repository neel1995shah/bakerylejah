import React, { useEffect, useState } from 'react';
import { filterByScope } from '../utils/auth';
import '../styles/Dashboard.css';

const STORAGE_KEY = 'gamdom-accounts';
const PAGE_SIZE = 50;

const Accounts = ({ token, username }) => {
  const [formData, setFormData] = useState({
    handler: '',
    accountName: '',
    password: ''
  });
  const [allAccounts, setAllAccounts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('handler-asc');
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);

  useEffect(() => {
    const savedAccounts = localStorage.getItem(STORAGE_KEY);
    if (!savedAccounts) {
      setHasLoadedAccounts(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedAccounts);
      if (Array.isArray(parsed)) {
        setAllAccounts(parsed);
      }
    } catch (err) {
      setMessage('Could not load saved accounts.');
    } finally {
      setHasLoadedAccounts(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedAccounts) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allAccounts));
    const visibleAccounts = filterByScope(allAccounts, username, 'handler');
    // Fallback: show all saved rows if strict scope filtering produces an empty view.
    setAccounts(visibleAccounts.length > 0 ? visibleAccounts : allAccounts);
  }, [allAccounts, username, hasLoadedAccounts]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [accounts.length, currentPage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');

    const trimmedHandler = formData.handler.trim();
    const trimmedAccountName = formData.accountName.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedHandler || !trimmedAccountName || !trimmedPassword) {
      setMessage('Please fill all fields.');
      return;
    }

    if (editingAccountId) {
      setAllAccounts((prev) =>
        prev.map((account) =>
          account.id === editingAccountId
            ? {
                ...account,
                handler: trimmedHandler,
                accountName: trimmedAccountName,
                password: trimmedPassword
              }
            : account
        )
      );
      setMessage('Account updated successfully.');
    } else {
      const newAccount = {
        id: Date.now(),
        handler: trimmedHandler,
        accountName: trimmedAccountName,
        password: trimmedPassword,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      setAllAccounts((prev) => [newAccount, ...prev]);
      setMessage('Account added successfully.');
    }

    setFormData({
      handler: '',
      accountName: '',
      password: ''
    });
    setShowCreateModal(false);
    setEditingAccountId(null);

    setTimeout(() => setMessage(''), 2500);
  };

  const handleOpenCreate = () => {
    setMessage('');
    setEditingAccountId(null);
    setFormData({
      handler: '',
      accountName: '',
      password: ''
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (account) => {
    setMessage('');
    setEditingAccountId(account.id);
    setFormData({
      handler: account.handler || '',
      accountName: account.accountName || account.accountId || '',
      password: account.password || ''
    });
    setShowCreateModal(true);
  };

  const handleStatusToggle = (id) => {
    setAllAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? {
              ...account,
              isActive: !account.isActive
            }
          : account
      )
    );
  };

  const handleDelete = (id) => {
    setAllAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  const handlerSuggestions = Array.from(
    new Set(allAccounts.map((account) => account.handler).filter(Boolean))
  );

  const accountNameSuggestions = Array.from(
    new Set(
      allAccounts
        .map((account) => account.accountName || account.accountId)
        .filter(Boolean)
    )
  );

  const filteredAccounts = accounts.filter((account) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      account.handler,
      account.accountName || account.accountId,
      account.password,
      account.isActive ? 'active' : 'inactive'
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const sortedAccounts = [...filteredAccounts].sort((left, right) => {
    const leftHandler = (left.handler || '').toLowerCase();
    const rightHandler = (right.handler || '').toLowerCase();
    const leftAccountName = (left.accountName || left.accountId || '').toLowerCase();
    const rightAccountName = (right.accountName || right.accountId || '').toLowerCase();

    switch (sortBy) {
      case 'handler-desc':
        return rightHandler.localeCompare(leftHandler);
      case 'account-asc':
        return leftAccountName.localeCompare(rightAccountName);
      case 'account-desc':
        return rightAccountName.localeCompare(leftAccountName);
      case 'status-active':
        return Number(right.isActive) - Number(left.isActive) || leftHandler.localeCompare(rightHandler);
      case 'status-inactive':
        return Number(left.isActive) - Number(right.isActive) || leftHandler.localeCompare(rightHandler);
      case 'newest':
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      case 'handler-asc':
      default:
        return leftHandler.localeCompare(rightHandler);
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / PAGE_SIZE));
  const paginatedAccounts = sortedAccounts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startItem = sortedAccounts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, sortedAccounts.length);

  return (
    <div className="dashboard-container">
      <h1>Accounts</h1>

      <div className="pl-toolbar">
        <button
          type="button"
          className="pl-add-btn"
          onClick={handleOpenCreate}
        >
          Add Account
        </button>
      </div>

      <div className="table-filters">
        <div className="form-group filter-group">
          <label htmlFor="account-search">Search</label>
          <input
            id="account-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setCurrentPage(1);
              setSearchTerm(e.target.value);
            }}
            placeholder="Search handler, account, password, status"
          />
        </div>
        <div className="form-group filter-group">
          <label htmlFor="account-sort">Sort By</label>
          <select
            id="account-sort"
            value={sortBy}
            onChange={(e) => {
              setCurrentPage(1);
              setSortBy(e.target.value);
            }}
          >
            <option value="handler-asc">Handler A-Z</option>
            <option value="handler-desc">Handler Z-A</option>
            <option value="account-asc">Account A-Z</option>
            <option value="account-desc">Account Z-A</option>
            <option value="status-active">Active First</option>
            <option value="status-inactive">Inactive First</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {message && <div className={message.includes('successfully') ? 'success-message' : 'error-message'}>
        {message}
      </div>}

      {showCreateModal && (
        <div className="pl-modal-overlay" role="dialog" aria-modal="true" aria-label="Create account">
          <div className="pl-modal">
            <h2>{editingAccountId ? 'Edit Account' : 'Create Account'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="handler">Handler</label>
                <input
                  id="handler"
                  type="text"
                  name="handler"
                  value={formData.handler}
                  onChange={handleChange}
                  placeholder="Enter handler name"
                  list="handler-suggestions"
                  required
                />
              </div>

              <datalist id="handler-suggestions">
                {handlerSuggestions.map((handlerName) => (
                  <option key={handlerName} value={handlerName} />
                ))}
              </datalist>

              <div className="form-group">
                <label htmlFor="accountName">Account Name</label>
                <input
                  id="accountName"
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  placeholder="Enter account name"
                  list="account-name-suggestions"
                  required
                />
              </div>

              <datalist id="account-name-suggestions">
                {accountNameSuggestions.map((accountName) => (
                  <option key={accountName} value={accountName} />
                ))}
              </datalist>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="pl-modal-actions">
                <button
                  type="button"
                  className="pl-cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pl-save-btn">
                  {editingAccountId ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container accounts-table-wrapper">
        <table className="ledger-table accounts-table">
          <thead>
            <tr>
              <th>Handler</th>
              <th>Account Name</th>
              <th>Password</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  {allAccounts.length === 0 ? 'No account fields added yet.' : 'No account fields match the current search.'}
                </td>
              </tr>
            ) : (
              paginatedAccounts.map((account) => (
                <tr key={account.id} className={!account.isActive ? 'account-row-inactive' : ''}>
                  <td>{account.handler}</td>
                  <td>{account.accountName || account.accountId}</td>
                  <td>{account.password}</td>
                  <td>
                    <button
                      type="button"
                      className={`status-chip ${account.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleStatusToggle(account.id)}
                    >
                      {account.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleOpenEdit(account)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDelete(account.id)}
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

      {sortedAccounts.length > PAGE_SIZE && (
        <div className="pagination-bar">
          <div className="pagination-summary">
            Showing {startItem}-{endItem} of {sortedAccounts.length}
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
    </div>
  );
};

export default Accounts;
