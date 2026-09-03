import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Candidate, ReadyForProcessItem } from '@/types';
import CandidateCard from '@/components/CandidateCard';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ReadyForProcessPageProps {
  onCandidateClick: (candidate: Candidate) => void;
}

export default function ReadyForProcessPage({ onCandidateClick }: ReadyForProcessPageProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<(ReadyForProcessItem & { candidate?: Candidate })[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function loadReady() {
    if (!profile) return;
    const { data } = await supabase
      .from('partner_ready_for_process')
      .select('*')
      .eq('partner_id', profile.id)
      .order('created_at', { ascending: false });
    const readyItems = (data as ReadyForProcessItem[]) ?? [];
    if (readyItems.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const candidateIds = readyItems.map((r) => r.candidate_id);
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .in('id', candidateIds);
    const candidateMap = new Map((candidates as Candidate[] | null)?.map((c) => [c.id, c]) ?? []);
    setItems(readyItems.map((r) => ({ ...r, candidate: candidateMap.get(r.candidate_id) })));
    setLoading(false);
  }

  useEffect(() => {
    loadReady();
  }, [profile]);

  async function moveBackToShortlist(item: ReadyForProcessItem) {
    if (!profile) return;
    setMovingId(item.id);
    await supabase.from('partner_shortlist').insert({
      partner_id: profile.id,
      candidate_id: item.candidate_id,
    });
    await supabase.from('partner_ready_for_process').delete().eq('id', item.id);
    setMovingId(null);
    loadReady();
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-72 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ready for Process</h1>
        <p className="text-sm text-slate-500 mt-1">{items.length} candidate{items.length !== 1 ? 's' : ''} ready for process</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium text-slate-500">No candidates ready for process yet</p>
          <p className="text-sm mt-1">Move candidates from your shortlist to this stage.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => item.candidate && (
            <div key={item.id} className="relative">
              <CandidateCard candidate={item.candidate} onClick={() => onCandidateClick(item.candidate!)} view="grid" />
              <button
                onClick={() => moveBackToShortlist(item)}
                disabled={movingId === item.id}
                className="mt-2 w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition"
              >
                {movingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                Move back to Shortlist
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
