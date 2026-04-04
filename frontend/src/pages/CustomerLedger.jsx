import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Phone, MoreVertical, FileText, Share2, MessageSquare, Plus, Minus, User, Calendar } from 'lucide-react';
import gsap from 'gsap';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState('gave');
  const [entryForm, setEntryForm] = useState({ amount: '', note: '' });
  const listRef = useRef(null);

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const isOwner = ['owner', 'manager', 'sub_manager', 'submanager', 'admin'].includes(role);
  const isWorker = role === 'worker';

  const getTokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const getType = () => location.pathname.includes('/suppliers/') ? 'suppliers' : 'customers';

  const fetchLedger = async () => {
    try {
      const type = getType();
      const config = { headers: getTokenHeader() };
      const [custRes, ledgerRes] = await Promise.all([
        axios.get(`/api/${type}/${id}`, config),
        axios.get(`/api/${type}/${id}/ledger`, config)
      ]);
      setCustomer(custRes.data);
      setLedger(ledgerRes.data);
    } catch (err) {
      console.error('Failed to fetch ledger', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, [id]);

  useEffect(() => {
    if (ledger.length > 0) {
      setTimeout(() => {
        const items = document.querySelectorAll('.ledger-item');
        if (items.length > 0) {
          gsap.fromTo('.ledger-item', 
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
          );
        }
      }, 50);
    }
  }, [ledger.length]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!entryForm.amount || isNaN(entryForm.amount)) return;
    try {
      const type = getType();
      await axios.post(`/api/${type}/${id}/ledger`, {
        amount: Number(entryForm.amount),
        type: entryType,
        note: entryForm.note
      }, { headers: getTokenHeader() });
      setEntryForm({ amount: '', note: '' });
      setShowEntryModal(false);
      fetchLedger();
    } catch (err) {
      alert('Failed to add entry');
    }
  };

  const handleReminder = () => {
    if (!customer) return;
    const text = `Namaste ${customer.name}, your current balance with us is ${formatCurrency(customer.dues)}. Please clear it soon. - Bakery Management`;
    window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(text)}`);
  };

  const handleSMS = () => {
    if (!customer) return;
    const text = `Balance Reminder: ₹${customer.dues}. - Bakery`;
    window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(text)}`;
  };

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  if (loading || !customer) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-bold animate-pulse">
      LOADING LEDGER...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans max-w-2xl mx-auto shadow-2xl relative">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-black shadow-lg shadow-blue-600/20">
            {customer.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight leading-tight">{customer.name}</h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {customer.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`tel:${customer.phone}`} className="p-2 hover:bg-white/10 rounded-full">
            <Phone size={22} />
          </a>
          <button className="p-2 hover:bg-white/10 rounded-full">
            <MoreVertical size={22} />
          </button>
        </div>
      </header>

      {/* Main Balance Card — ONLY for owners/managers */}
      {isOwner && (
        <div className="p-4">
          <div className="bg-[#1a1a1a] rounded-3xl p-5 border border-white/5 shadow-xl">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-white/50">You will get</p>
              <p className="text-2xl font-black text-rose-500 tracking-tight">{formatCurrency(customer.dues)}</p>
            </div>
            <div className="mt-6 flex items-center justify-between text-white/30 hover:text-white/60 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <Calendar size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Set Collection Dates</span>
              </div>
              <ArrowLeft className="rotate-180" size={16} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <ActionButton onClick={() => alert('PDF generation coming soon!')} icon={<FileText size={20} />} label="Report" />
            <ActionButton onClick={handleReminder} icon={<Share2 size={20} />} label="Reminders" />
            <ActionButton onClick={handleSMS} icon={<MessageSquare size={20} />} label="SMS" />
          </div>
        </div>
      )}

      {/* Worker info banner */}
      {isWorker && (
        <div className="px-4 pt-4">
          <div className="bg-emerald-900/30 rounded-2xl p-4 border border-emerald-500/20">
            <p className="text-sm font-bold text-emerald-400/80">
              You can record payments received from this customer.
            </p>
          </div>
        </div>
      )}

      {/* Ledger Entries */}
      <div className="flex-1 px-4 pb-32 pt-4">
        <div className="flex justify-between px-2 mb-2">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Entries</span>
          {isOwner && (
            <div className="flex gap-12">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">You Gave</span>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">You Got</span>
            </div>
          )}
        </div>

        <div className="space-y-3" ref={listRef}>
          {ledger.map((entry) => (
            <div key={entry._id} className="ledger-item bg-[#141414] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/60">
                    {new Date(entry.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                  {isOwner && (
                    <p className="text-[10px] bg-white/5 py-1 px-2 rounded-lg inline-block font-black text-white/40">
                      Bal. {formatCurrency(entry.runningBalance)}
                    </p>
                  )}
                  {entry.note && (
                    <p className="text-xs font-medium text-white/30 mt-2 italic line-clamp-1">"{entry.note}"</p>
                  )}
                </div>

                <div className="flex items-center h-full pt-1">
                  {isOwner ? (
                    /* Owners see both gave and got columns */
                    <div className="flex gap-8">
                      <div className="w-16 text-right">
                        {entry.type === 'gave' && (
                          <span className="text-lg font-black text-rose-500">{formatCurrency(entry.amount)}</span>
                        )}
                      </div>
                      <div className="w-16 text-right">
                        {entry.type === 'got' && (
                          <span className="text-lg font-black text-emerald-500">{formatCurrency(entry.amount)}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Workers only see "got" entries with a simple badge */
                    entry.type === 'got' && (
                      <span className="text-lg font-black text-emerald-500">{formatCurrency(entry.amount)}</span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <User size={48} className="mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-sm">No transactions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions — Role-based */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl p-4 bg-[#0a0a0a]/80 backdrop-blur-md border-t border-white/5 z-10">
        {isOwner ? (
          /* Owners see both buttons */
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEntryType('gave'); setShowEntryModal(true); }}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <Minus size={18} /> You Gave ₹
            </button>
            <button
              onClick={() => { setEntryType('got'); setShowEntryModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> You Got ₹
            </button>
          </div>
        ) : (
          /* Workers only see "You Got" (record payment received) */
          <button
            onClick={() => { setEntryType('got'); setShowEntryModal(true); }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Record Payment Received ₹
          </button>
        )}
      </footer>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className={`p-4 ${entryType === 'gave' ? 'bg-rose-600' : 'bg-emerald-600'} text-center`}>
              <h2 className="text-sm font-black uppercase tracking-widest">
                Entry: You {entryType === 'gave' ? 'Gave' : 'Got'}
              </h2>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Amount (₹)</label>
                <input
                  autoFocus
                  type="number"
                  required
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  className="w-full bg-[#242424] border border-white/5 rounded-xl p-4 text-2xl font-black text-white outline-none focus:border-white/20 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Description (Optional)</label>
                <input
                  type="text"
                  value={entryForm.note}
                  onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                  className="w-full bg-[#242424] border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-white/20 transition-all"
                  placeholder="Add a note..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${entryType === 'gave' ? 'bg-rose-600 shadow-rose-600/20' : 'bg-emerald-600 shadow-emerald-600/20'}`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#141414] border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all active:scale-95 text-center min-w-[80px]"
    >
      <span className="text-white/60">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
    </button>
  );
}
