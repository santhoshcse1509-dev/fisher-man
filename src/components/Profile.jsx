import React, { useState, useEffect } from 'react';
import { User, Phone, Save, X, Shield } from 'lucide-react';
import clsx from 'clsx';

export default function Profile({ isOpen, onClose, language, onTestAlert }) {
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
      save: 'Profile Saved!',
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

  const t = translations[language] || translations.en;

  useEffect(() => {
    const saved = localStorage.getItem('fisher_profile');
    if (saved) {
      setFormData(JSON.parse(saved));
    }
  }, []);

  if (!isOpen) return null;

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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal panel — bottom sheet on mobile, centered on sm+ */}
      <div className={clsx(
        "relative z-10 w-full bg-white dark:bg-slate-900 shadow-2xl animate-scale-in",
        "sm:max-w-md sm:rounded-3xl",
        // Mobile: bottom sheet style
        "rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
      )}>

        {/* Drag handle on mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 sm:p-6 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-white/20 p-1.5 sm:p-2 rounded-full flex-shrink-0">
              <User size={20} />
            </div>
            <h2 className="text-base sm:text-xl font-bold leading-tight truncate">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            id="profile-close-btn"
            className="p-2 hover:bg-white/20 rounded-full transition flex-shrink-0 touch-target"
            aria-label="Close profile"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          id="profile-form"
          className="flex-1 p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto scrollbar-thin modal-scroll"
        >
          {/* Name field */}
          <div>
            <label
              htmlFor="profile-username"
              className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1 ml-1"
            >
              {t.username}
            </label>
            <input
              id="profile-username"
              required
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="name"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/40 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition text-base"
              placeholder={t.enterName}
            />
          </div>

          {/* Emergency contacts section */}
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Shield size={16} />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">{t.recipients}</span>
            </div>

            <InputGroup
              id="profile-mobile"
              icon={<Phone size={14} />}
              label={t.mobile}
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              required
            />
            <InputGroup
              id="profile-family1"
              icon={<User size={14} />}
              label={t.family1}
              name="family1"
              value={formData.family1}
              onChange={handleChange}
              required
            />
            <InputGroup
              id="profile-family2"
              icon={<User size={14} />}
              label={t.family2}
              name="family2"
              value={formData.family2}
              onChange={handleChange}
              required
            />
            <InputGroup
              id="profile-police"
              icon={<Shield size={14} />}
              label={t.police}
              name="police"
              value={formData.police}
              onChange={handleChange}
              required
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col xs:flex-row gap-3 pt-1">
            <button
              type="button"
              id="profile-test-alert-btn"
              onClick={onTestAlert}
              className="flex-1 py-3.5 sm:py-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition flex justify-center items-center gap-2 touch-target"
            >
              <Shield size={18} />
              <span className="truncate">{t.testAlert}</span>
            </button>
            <button
              type="submit"
              id="profile-save-btn"
              className="flex-1 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition flex justify-center items-center gap-2 touch-target"
            >
              <Save size={18} />
              <span className="truncate">{t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputGroup({ id, icon, label, name, value, onChange, required }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </div>
      <input
        id={id}
        required={required}
        type="tel"
        name={name}
        value={value}
        onChange={onChange}
        autoComplete="tel"
        inputMode="tel"
        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black/20 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-base font-medium transition"
        placeholder={label}
      />
    </div>
  );
}
