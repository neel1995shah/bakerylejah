import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Search, Plus, Trash2, FileText, ArrowUpDown } from 'lucide-react';
import gsap from 'gsap';

export default function Customers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const isAdmin = ['owner', 'sub_manager', 'manager'].includes(role);
  const isOwner = ['owner', 'sub_manager', 'manager', 'admin', 'submanager'].includes(role);

  useEffect(() => {
    document.documentElement.style.colorScheme = 'light';
  }, []);

  const getTokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchEntity = async (entity, setState) => {
    const res = await axios.get(`/api/${entity}`, {
      headers: getTokenHeader()
    });
    setState(res.data);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        fetchEntity('customers', setCustomers),
        fetchEntity('suppliers', setSuppliers)
      ]);

      // Small timeout to ensure DOM update is complete
      setTimeout(() => {
        const rows = document.querySelectorAll('.ledger-row');
        if (rows.length > 0) {
          gsap.fromTo(
            '.ledger-row',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
          );
        }
      }, 50);
    } catch (err) {
      setError('Failed to load entries');
      console.error('Failed to fetch entries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const entries = activeTab === 'customers' ? customers : suppliers;

  const filtered = useMemo(
    () => entries.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [entries, search]
  );

  const totalReceivable = customers.reduce((sum, item) => sum + (item.dues > 0 ? item.dues : 0), 0);
  const totalPayable = suppliers.reduce((sum, item) => sum + (item.dues > 0 ? item.dues : 0), 0);

  const formatCurrency = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const timeAgo = (value) => {
    if (!value) return 'Recently';
    const then = new Date(value).getTime();
    const now = Date.now();
    const diff = Math.max(now - then, 0);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} min ago`;
    if (diff < day) return `${Math.floor(diff / hour)} hour ago`;
    if (diff < 30 * day) return `${Math.floor(diff / day)} day ago`;
    return `${Math.floor(diff / (30 * day))} month ago`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(
        `/api/${activeTab}`,
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim()
        },
        { headers: getTokenHeader() }
      );

      setForm({ name: '', phone: '', address: '' });
      setShowAddForm(false);
      await fetchAll();
    } catch (err) {
      const label = activeTab === 'customers' ? 'customer' : 'supplier';
      const message = err?.response?.data?.message || `Failed to create ${label}`;
      setError(message);
    }
  };

  const handleDelete = async (id, name) => {
    const label = activeTab === 'customers' ? 'customer' : 'supplier';
    const accepted = window.confirm(`Delete ${label} ${name}?`);
    if (!accepted) return;

    setError('');

    try {
      await axios.delete(`/api/${activeTab}/${id}`, {
        headers: getTokenHeader()
      });

      if (activeTab === 'customers') {
        setCustomers((prev) => prev.filter((item) => item._id !== id));
      } else {
        setSuppliers((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      const message = err?.response?.data?.message || `Failed to delete ${label}`;
      setError(message);
    }
  };

  const singularLabel = activeTab === 'customers' ? 'Customer' : 'Supplier';

  return (
    <div className="space-y-3 bg-white pb-28 text-slate-900 md:space-y-4 md:pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Customers</h1>
            <p className="text-xs font-semibold text-slate-500">Khata ledger in white mode</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
            <Users size={18} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 border-b border-slate-200 text-[15px] font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`pb-2 ${activeTab === 'customers' ? 'border-b-2 border-slate-900 text-slate-900' : ''}`}
          >
            Customers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`pb-2 ${activeTab === 'suppliers' ? 'border-b-2 border-slate-900 text-slate-900' : ''}`}
          >
            Suppliers
          </button>
          <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[11px] font-black text-white">NEW</span>
        </div>
      </header>

      {isOwner && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">You will give</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{formatCurrency(totalPayable)}</p>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700 hover:text-sky-900 transition-colors"
            >
              <FileText size={14} />
              View Report
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">You will get</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-rose-600">{formatCurrency(totalReceivable)}</p>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700 hover:text-sky-900 transition-colors"
            >
              <Users size={14} />
              Open Cashbook
            </button>
          </div>
        </div>
      </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
          <Search className="text-slate-400" size={17} />
          <input
            type="text"
            placeholder={`Search ${singularLabel}`}
            className="w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500">
            <ArrowUpDown size={17} />
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500"
          >
            <FileText size={17} />
          </button>
        </div>

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {filtered.map((item) => (
            <div 
              key={item._id} 
              onClick={() => navigate(`/${activeTab}/${item._id}/ledger`)}
              className="ledger-row group flex items-start justify-between gap-3 px-3 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-black text-white">
                  {getInitials(item.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-black leading-tight text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-[13px] font-semibold text-slate-500">{timeAgo(item.updatedAt || item.createdAt)}</p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">{item.address}</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item._id, item.name);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-rose-600"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>

              {isOwner && (
              <div className="shrink-0 text-right">
                <p className={`text-2xl font-black leading-none ${item.dues > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatCurrency(item.dues)}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">{item.dues > 0 ? "You'll Get" : ''}</p>
              </div>
              )}
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-9 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Users size={24} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">No matching {activeTab}</h3>
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-dashed border-slate-200 py-9 text-center text-sm font-semibold text-slate-500">
            Loading entries...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}
      </section>

      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-28 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-pink-600 px-5 py-3 text-base font-black text-white shadow-lg md:bottom-6"
        >
          <Plus size={18} />
          Add {singularLabel}
        </button>
      )}

      {isAdmin && showAddForm && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/30">
          <div className="w-full rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Add {singularLabel}</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md px-2 py-1 text-xs font-bold text-slate-500"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-2.5">
              <input
                type="text"
                placeholder="Name"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Phone"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Address"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                required
              />
              <button
                type="submit"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white"
              >
                <Plus size={14} />
                Save {singularLabel}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ledger Summary</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business Health Report</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Main Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Receivable</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalReceivable)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Payable</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalPayable)}</p>
                </div>
              </div>

              {/* Counts */}
              <div className="flex items-center justify-around py-4 border-y border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{customers.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customers</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{suppliers.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suppliers</p>
                </div>
              </div>

              {/* Debtors List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpDown size={14}/> Top Debtors
                </h3>
                <div className="space-y-2">
                  {[...customers].sort((a,b) => b.dues - a.dues).slice(0, 3).map(c => (
                    <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-black text-white">
                          {getInitials(c.name)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{c.name}</span>
                      </div>
                      <span className="text-sm font-black text-rose-600">{formatCurrency(c.dues)}</span>
                    </div>
                  ))}
                  {customers.length === 0 && <p className="text-xs text-slate-400 italic">No customer data available</p>}
                </div>
              </div>

              {/* Creditors List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpDown size={14} /> Top Creditors
                </h3>
                <div className="space-y-2">
                  {[...suppliers].sort((a,b) => b.dues - a.dues).slice(0, 3).map(s => (
                    <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-[10px] font-black text-white">
                          {getInitials(s.name)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{s.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(s.dues)}</span>
                    </div>
                  ))}
                  {suppliers.length === 0 && <p className="text-xs text-slate-400 italic">No supplier data available</p>}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 text-center">
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full py-3 rounded-xl bg-white text-slate-900 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

