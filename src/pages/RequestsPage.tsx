import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CandidateRequest, Candidate, Profile, RequestStatus } from '@/types';
import { RequestStatusBadge } from '@/components/Badges';
import { REQUEST_STATUS_OPTIONS } from '@/types';
import { Clock, Check, X, ArrowRight, Loader2, MessageSquare, User } from 'lucide-react';

interface RequestsPageProps {
  onCandidateClick: (candidate: Candidate) => void;
}

export default function RequestsPage({ onCandidateClick }: RequestsPageProps) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<(CandidateRequest & { candidate?: Candidate; partner?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadRequests() {
    let query = supabase
      .from('candidate_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.role !== 'admin') {
      query = query.eq('partner_id', profile?.id);
    }

    const { data: reqData } = await query;
    const reqs = (reqData as CandidateRequest[]) ?? [];
    if (reqs.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const candidateIds = [...new Set(reqs.map((r) => r.candidate_id))];
    const partnerIds = [...new Set(reqs.map((r) => r.partner_id))];

    const [{ data: candidates }, { data: partners }] = await Promise.all([
      supabase.from('candidates').select('*').in('id', candidateIds),
      supabase.from('profiles').select('*').in('id', partnerIds),
    ]);

    const candidateMap = new Map((candidates as Candidate[] | null)?.map((c) => [c.id, c]) ?? []);
    const partnerMap = new Map((partners as Profile[] | null)?.map((p) => [p.id, p]) ?? []);

    setRequests(reqs.map((r) => ({
      ...r,
      candidate: candidateMap.get(r.candidate_id),
      partner: partnerMap.get(r.partner_id),
    })));
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [profile]);

  async function updateStatus(req: CandidateRequest, status: RequestStatus) {
    setUpdatingId(req.id);
    await supabase
      .from('candidate_requests')
      .update({
        status,
        responded_at: new Date().toISOString(),
        responded_by: profile?.id,
      })
      .eq('id', req.id);
    setUpdatingId(null);
    loadRequests();
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isAdmin ? 'Candidate Requests' : 'My Requests'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin ? 'Manage all candidate requests from recruiting partners' : 'Track the status of your candidate requests'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({requests.length})
        </button>
        {REQUEST_STATUS_OPTIONS.map((opt) => {
          const count = requests.filter((r) => r.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === opt.value ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No requests yet</p>
          <p className="text-sm mt-1">
            {isAdmin ? 'Candidate requests from partners will appear here.' : 'Browse candidates and request access to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Candidate info */}
                <button
                  onClick={() => req.candidate && onCandidateClick(req.candidate)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {req.candidate?.photo_url ? (
                      <img src={req.candidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">
                        {req.candidate?.first_name[0]}{req.candidate?.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm group-hover:text-slate-700">
                      {req.candidate?.first_name} {req.candidate?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{req.candidate?.profession} · {req.candidate?.candidate_id}</p>
                  </div>
                </button>

                {/* Partner info (admin only) */}
                {isAdmin && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 md:w-48">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{req.partner?.full_name || req.partner?.email}</p>
                      <p className="text-xs text-slate-400 truncate">{req.partner?.company_name}</p>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="text-xs text-slate-500 md:w-32">
                  {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* Status */}
                <div className="md:w-32">
                  <RequestStatusBadge status={req.status} />
                </div>

                {/* Actions (admin only) */}
                {isAdmin && req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(req, 'approved')}
                      disabled={updatingId === req.id}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
                    >
                      {updatingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(req, 'rejected')}
                      disabled={updatingId === req.id}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
                {isAdmin && req.status === 'approved' && (
                  <button
                    onClick={() => updateStatus(req, 'placed')}
                    disabled={updatingId === req.id}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition disabled:opacity-50"
                  >
                    {updatingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Mark Placed
                  </button>
                )}
              </div>

              {/* Message */}
              {req.message && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-sm text-slate-600">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="italic">{req.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
