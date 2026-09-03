import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, CandidateRequest } from '@/types';
import { UserPlus, Loader2, Building2, Mail, Phone, X } from 'lucide-react';

export default function PartnersPage() {
  const [partners, setPartners] = useState<Profile[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', company_name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadPartners() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'recruiting_partner')
      .order('created_at', { ascending: false });
    const partnerList = (data as Profile[]) ?? [];
    setPartners(partnerList);
    setLoading(false);

    if (partnerList.length > 0) {
      const { data: reqs } = await supabase
        .from('candidate_requests')
        .select('partner_id');
      const counts: Record<string, number> = {};
      (reqs as CandidateRequest[] | null)?.forEach((r) => {
        counts[r.partner_id] = (counts[r.partner_id] ?? 0) + 1;
      });
      setRequestCounts(counts);
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  async function handleAddPartner(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/create-partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Failed to create partner');
      }
      setShowAddModal(false);
      setFormData({ email: '', password: '', full_name: '', company_name: '', phone: '' });
      loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create partner');
    }
    setSubmitting(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiting Partners</h1>
          <p className="text-sm text-slate-500 mt-1">{partners.length} registered partners</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No partners yet</p>
          <p className="text-sm mt-1">Add a recruiting partner to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => {
            const initials = p.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500 truncate">{p.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600">
                  {p.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {p.company_name}
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {p.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Member since {new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{requestCounts[p.id] ?? 0}</span> candidate requests
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900 text-lg">Add Recruiting Partner</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPartner} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                  <input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
