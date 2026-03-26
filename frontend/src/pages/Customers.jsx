import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Phone, MapPin } from 'lucide-react';
import Card from '../components/ui/Card.jsx';

export default function Customers() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/customers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customer Directory</h2>
        <p className="text-sm text-gray-500 mt-1">Manage customer profiles and outstanding dues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(c => (
          <Card key={c._id}>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 leading-tight">{c.name}</h3>
                <p className={`text-sm font-semibold mt-1 ${c.dues > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  Dues: ${c.dues?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{c.phone || 'No phone'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <span>{c.address?.street}, {c.address?.city}</span>
              </div>
            </div>
          </Card>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}