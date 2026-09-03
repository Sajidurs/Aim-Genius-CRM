import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Building2, Phone, Mail, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [full_name, setFullName] = useState(profile?.full_name ?? '');
  const [company_name, setCompanyName] = useState(profile?.company_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({ full_name, company_name: company_name || null, phone: phone || null })
      .eq('id', profile?.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your account information</p>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Account Role</p>
            <p className="text-xs text-slate-500 capitalize">
              {profile?.role === 'admin' ? 'Administrator' : 'Recruiting Partner'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail className="w-4 h-4 text-slate-400" />
          {profile?.email}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={full_name} onChange={(e) => setFullName(e.target.value)} className={inputClass + ' pl-10'} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={company_name} onChange={(e) => setCompanyName(e.target.value)} className={inputClass + ' pl-10'} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass + ' pl-10'} />
            </div>
          </div>
        </div>

        {saved && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
            Profile saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </form>
    </div>
  );
}
