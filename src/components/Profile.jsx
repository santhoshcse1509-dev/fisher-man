import React, { useState, useEffect } from 'react';
import { User, Phone, Save, X, Shield } from 'lucide-react';
import clsx from 'clsx';

export default function Profile({ isOpen, onClose, language, onTestAlert }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    username: '',
    mobile: '',
    family1: '',
    family2: '',
    police: ''
  });

  const translations = {
    en: {
      title: 'Profile & Emergency Contacts',
      username: 'Fisherman Name',
      mobile: 'Your Mobile Number',
      family1: 'Family Member 1',
      family2: 'Family Member 2',
      police: 'Coastal Police Station',
      save: 'Save Profile',
      saved: 'Profile Saved!',
      testAlert: 'Test Alert System',
      recipients: 'Emergency Alert Recipients',
      enterName: 'Enter name'
    },
    ta: {
      title: 'சுயவிவரம் & அவசர எண்கள்',
      username: 'மீனவர் பெயர்',
      mobile: 'உங்கள் அலைபேசி எண்',
      family1: 'குடும்ப உறுப்பினர் 1',
      family2: 'குடும்ப உறுப்பினர் 2',
      police: 'கடலோர காவல் நிலையம்',
      save: 'சேமிக்க',
      saved: 'சேமிக்கப்பட்டது!',
      testAlert: 'சோதனை அலாரம்',
      recipients: 'அவசரகால தகவல் பெறுநர்',
      enterName: 'பெயரை உள்ளிடவும்'
    }
  };

  const t = translations[language];

  useEffect(() => {
    const saved = localStorage.getItem('fisher_profile');
    if (saved) {
      setFormData(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('fisher_profile', JSON.stringify(formData));
    alert(t.saved);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <User size={24} />
            </div>
            <h2 className="text-xl font-bold">{t.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1 ml-1">{t.username}</label>
            <input 
              required
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/40 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder={t.enterName}
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
              <Shield size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">{t.recipients}</span>
            </div>
            
            <InputGroup icon={<Phone size={10} />} label={t.mobile} name="mobile" value={formData.mobile} onChange={handleChange} required />
            <InputGroup icon={<User size={10} />} label={t.family1} name="family1" value={formData.family1} onChange={handleChange} required />
            <InputGroup icon={<User size={10} />} label={t.family2} name="family2" value={formData.family2} onChange={handleChange} required />
            <InputGroup icon={<Shield size={10} />} label={t.police} name="police" value={formData.police} onChange={handleChange} required />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onTestAlert}
              className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition flex justify-center items-center gap-2 mt-4"
            >
              <Shield size={20} />
              {t.testAlert}
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition flex justify-center items-center gap-2 mt-4"
            >
              <Save size={20} />
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputGroup({ icon, label, name, value, onChange, required }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-slate-400">
        {icon}
      </div>
      <input 
        required={required}
        type="tel"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black/20 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium transition"
        placeholder={label}
      />
    </div>
  )
}
