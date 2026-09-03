import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Candidate, ShortlistItem } from '@/types';
import CandidateCard from '@/components/CandidateCard';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ShortlistPageProps {
  onCandidateClick: (candidate: Candidate) => void;
}

export default function ShortlistPage({ onCandidateClick }: ShortlistPageProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<(ShortlistItem & { candidate?: Candidate })[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function loadShortlist() {
    if (!profile) return;
    const { data } = await supabase
      .from('partner_shortlist')
      .select('*')
      .eq('partner_id', profile.id)
      .order('created_at', { ascending: false });
    const shortlistItems = (data as ShortlistItem[]) ?? [];
    if (shortlistItems.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const candidateIds = shortlistItems.map((s) => s.candidate_id);
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .in('id', candidateIds);
    const candidateMap = new Map((candidates as Candidate[] | null)?.map((c) => [c.id, c]) ?? []);
    setItems(shortlistItems.map((s) => ({ ...s, candidate: candidateMap.get(s.candidate_id) })));
    setLoading(false);
  }

  useEffect(() => {
    loadShortlist();
  }, [profile]);

  async function moveToReadyForProcess(item: ShortlistItem) {
    if (!profile) return;
    setMovingId(item.id);
    await supabase.from('partner_ready_for_process').insert({
      partner_id: profile.id,
      candidate_id: item.candidate_id,
    });
    await supabase.from('partner_shortlist').delete().eq('id', item.id);
    setMovingId(null);
    loadShortlist();
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shortlist</h1>
        <p className="text-sm text-slate-500 mt-1">{items.length} candidate{items.length !== 1 ? 's' : ''} in your shortlist</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium text-slate-500">Your shortlist is empty</p>
          <p className="text-sm mt-1">Browse candidates and click "Shortlist" to add them here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => item.candidate && (
            <div key={item.id} className="relative">
              <CandidateCard candidate={item.candidate} onClick={() => onCandidateClick(item.candidate!)} view="grid" />
              <button
                onClick={() => moveToReadyForProcess(item)}
                disabled={movingId === item.id}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition"
              >
                {movingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Move to Ready for Process
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
