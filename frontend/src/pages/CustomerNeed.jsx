import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, ClipboardCheck, MapPin, Phone, User } from 'lucide-react';

export default function CustomerNeed() {
  const [needs, setNeeds] = useState([]);
  const [images, setImages] = useState([]);
  const [previewImage, setPreviewImage] = useState('');
  const [form, setForm] = useState({
    requirement: '',
    customerName: '',
    customerPhone: '',
    customerAddress: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    const fetchNeeds = async () => {
      try {
        const res = await axios.get('/api/customer-needs');
        setNeeds(res.data || []);
      } catch (err) {
        console.error('Failed to load customer needs', err);
      }
    };

    fetchNeeds();
  }, []);

  const openNeeds = useMemo(() => needs.filter((n) => n.status !== 'done'), [needs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      requirement: form.requirement.trim(),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerAddress: form.customerAddress.trim()
    };

    if (!payload.requirement || !payload.customerName || !payload.customerPhone) {
      return;
    }

    setSubmitting(true);
    try {
      let imageUrls = [];
      let imagePublicIds = [];
      if (images.length > 0) {
        const data = new FormData();
        images.forEach((file) => data.append('images', file));
        const uploadRes = await axios.post('/api/uploads/images', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrls = (uploadRes.data?.images || []).map((img) => img.url).filter(Boolean);
        imagePublicIds = (uploadRes.data?.images || []).map((img) => img.publicId).filter(Boolean);
      }

      const res = await axios.post('/api/customer-needs', {
        ...payload,
        imageUrls,
        imagePublicIds
      });
      setNeeds((prev) => [res.data, ...prev]);
      setForm({ requirement: '', customerName: '', customerPhone: '', customerAddress: '' });
      setImages([]);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to register customer need');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = async (id) => {
    try {
      await axios.put(`/api/customer-needs/${id}/done`);
      setNeeds((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to mark as done');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black text-primary tracking-tight">Customer Need</h1>
        <p className="text-primary/60 font-medium">Anyone can register customer requirements. Mark done removes requirement and product photo permanently.</p>
      </div>

      <form onSubmit={handleCreate} className="glass-card rounded-3xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Customer requirement"
          value={form.requirement}
          onChange={(e) => setForm((p) => ({ ...p, requirement: e.target.value }))}
          className="md:col-span-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
          required
        />
        <input
          type="text"
          placeholder="Customer name"
          value={form.customerName}
          onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
          required
        />
        <input
          type="text"
          placeholder="Customer phone"
          value={form.customerPhone}
          onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
          required
        />
        <input
          type="text"
          placeholder="Customer address (optional)"
          value={form.customerAddress}
          onChange={(e) => setForm((p) => ({ ...p, customerAddress: e.target.value }))}
          className="md:col-span-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
        />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files || []))}
          className="md:col-span-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-primary outline-none"
        />
        {images.length > 0 && (
          <p className="md:col-span-2 text-xs font-bold text-primary/60 uppercase tracking-wider">
            {images.length} image(s) selected
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary md:col-span-2 justify-center">
          <ClipboardCheck size={16} /> Register Need
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {openNeeds.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 glass-card rounded-2xl p-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-primary/40 mb-2" />
            <p className="font-black text-primary">No pending customer needs</p>
            <p className="text-sm text-primary/55">Completed needs are hidden from this page.</p>
          </div>
        )}

        {openNeeds.map((n) => (
          <div key={n._id} className="glass-card rounded-2xl p-4 flex flex-col gap-3 border border-black/5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Requirement</p>
              <p className="font-black text-primary text-base break-words">{n.requirement}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-primary flex items-center gap-2"><User size={14} /> {n.customerName}</p>
              <p className="text-sm font-semibold text-primary/80 flex items-center gap-2"><Phone size={14} /> {n.customerPhone}</p>
              {n.customerAddress && (
                <p className="text-sm font-semibold text-primary/70 flex items-start gap-2"><MapPin size={14} className="mt-0.5" /> {n.customerAddress}</p>
              )}
            </div>

            {Array.isArray(n.imageUrls) && n.imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {n.imageUrls.map((url) => (
                  <button key={url} type="button" onClick={() => setPreviewImage(url)} className="block">
                    <img src={url} alt="Need product" className="w-full h-20 rounded-lg object-cover border border-black/10" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/50">
              Added by {n.createdBy?.username || 'user'} | {new Date(n.createdAt).toLocaleString()}
            </p>

            <button
              type="button"
              onClick={() => handleDone(n._id)}
              className="mt-auto min-h-[42px] rounded-xl bg-green-600 text-white text-xs font-black uppercase tracking-wider"
            >
              Mark as Done
            </button>
          </div>
        ))}
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

