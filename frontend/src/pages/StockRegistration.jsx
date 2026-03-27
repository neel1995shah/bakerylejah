import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Plus } from 'lucide-react';

export default function StockRegistration() {
  const [alerts, setAlerts] = useState([]);
  const [itemName, setItemName] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('medium');
  const [imageFile, setImageFile] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [previewImage, setPreviewImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    const fetchAlerts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/stock-alerts');
        setAlerts(res.data || []);
      } catch (err) {
        console.error('Failed to load stock alerts', err);
      }
    };

    fetchAlerts();
  }, []);

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts]);
  const filteredAlerts = useMemo(() => {
    if (activeTab === 'all') return openAlerts;
    return openAlerts.filter((a) => a.priority === activeTab);
  }, [openAlerts, activeTab]);
  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = itemName.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      let imageUrl = '';
      let imagePublicId = '';

      if (imageFile) {
        const form = new FormData();
        form.append('image', imageFile);
        const uploadRes = await axios.post('http://localhost:5000/api/uploads/image', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        imageUrl = uploadRes.data?.url || '';
        imagePublicId = uploadRes.data?.publicId || '';
      }

      const res = await axios.post('http://localhost:5000/api/stock-alerts', {
        itemName: trimmed,
        note: note.trim(),
        priority,
        imageUrl,
        imagePublicId
      });

      setAlerts((prev) => [res.data, ...prev]);
      setItemName('');
      setNote('');
      setPriority('medium');
      setImageFile(null);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create stock alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/stock-alerts/${id}/complete`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to complete stock alert');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black text-primary tracking-tight">Stock Registration</h1>
        <p className="text-primary/60 font-medium">Anyone can add stock alerts with product image. Completing an alert removes it permanently.</p>
      </div>

      <form onSubmit={handleCreate} className="glass-card rounded-3xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Item name (e.g., Wheat Flour)"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="md:col-span-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
          required
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full justify-center"
        >
          <Plus size={16} /> Add Alert
        </button>

        <textarea
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="md:col-span-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none min-h-[90px]"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="md:col-span-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
        />
        {imageFile && (
          <p className="md:col-span-4 text-xs font-bold text-primary/60 uppercase tracking-wider">
            Selected image: {imageFile.name}
          </p>
        )}
      </form>

      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h3 className="font-black text-primary tracking-tight flex items-center gap-2"><AlertTriangle size={16} /> Open Alerts</h3>
          <span className="text-xs font-bold text-primary/60">{openAlerts.length}</span>
        </div>
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: `All (${openAlerts.length})` },
            { key: 'high', label: `High (${openAlerts.filter((a) => a.priority === 'high').length})` },
            { key: 'medium', label: `Medium (${openAlerts.filter((a) => a.priority === 'medium').length})` },
            { key: 'low', label: `Low (${openAlerts.filter((a) => a.priority === 'low').length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white border border-black/10 text-primary/70 hover:bg-primary/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {filteredAlerts.length === 0 && (
            <p className="text-sm font-semibold text-primary/50">No open alerts.</p>
          )}
          {filteredAlerts.map((a) => (
            <div key={a._id} className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-primary break-all">{a.itemName}</p>
                  {a.note && <p className="text-sm text-primary/70 mt-1">{a.note}</p>}
                  {a.imageUrl && (
                    <button type="button" onClick={() => setPreviewImage(a.imageUrl)} className="block mt-2">
                      <img src={a.imageUrl} alt={a.itemName} className="w-24 h-24 rounded-xl object-cover border border-black/10" />
                    </button>
                  )}
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary/50 mt-2">
                    by {a.createdBy?.username || 'user'} | {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${priorityBadge(a.priority)}`}>
                  {a.priority}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleComplete(a._id)}
                className="mt-3 min-h-[38px] px-3 rounded-lg bg-green-600 text-white text-xs font-black uppercase tracking-wider"
              >
                Mark Completed
              </button>
            </div>
          ))}
        </div>
      </div>

      {previewImage && (
        <button
          type="button"
          onClick={() => setPreviewImage('')}
          className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center"
        >
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-2xl" />
        </button>
      )}
    </div>
  );
}

function priorityBadge(priority) {
  if (priority === 'high') return 'bg-red-100 text-red-700';
  if (priority === 'low') return 'bg-blue-100 text-blue-700';
  return 'bg-yellow-100 text-yellow-700';
}
