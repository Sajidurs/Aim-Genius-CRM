import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Candidate } from '@/types';
import { AvailabilityBadge } from '@/components/Badges';
import { Users, UserCheck, Languages, Briefcase, Clock, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (key: string) => void;
  onCandidateClick: (candidate: Candidate) => void;
}

export default function DashboardPage({ onNavigate, onCandidateClick }: DashboardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });
      setCandidates((data as Candidate[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const total = candidates.length;
  const available = candidates.filter((c) => c.availability === 'available').length;
  const recent = candidates.slice(0, 5);

  const byProfession = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.profession] = (acc[c.profession] ?? 0) + 1;
    return acc;
  }, {});
  const topProfessions = Object.entries(byProfession)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const byGermanLevel = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => ({
    level,
    count: candidates.filter((c) => c.german_level === level).length,
  color: level === 'C2' ? 'bg-slate-900' : level === 'C1' ? 'bg-slate-700' : level === 'B2' ? 'bg-slate-600' : level === 'B1' ? 'bg-slate-500' : level === 'A2' ? 'bg-slate-400' : 'bg-slate-300',
  }));

  const maxProfessionCount = Math.max(...topProfessions.map((p) => p[1]), 1);
  const maxGermanCount = Math.max(...byGermanLevel.map((l) => l.count), 1);

  const stats = [
    { label: 'Total Candidates', value: total, icon: Users, color: 'text-slate-900', bg: 'bg-slate-100' },
    { label: 'Available Now', value: available, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Professions', value: Object.keys(byProfession).length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'German B2+', value: candidates.filter((c) => ['B2', 'C1', 'C2'].includes(c.german_level)).length, icon: Languages, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your candidate database</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* By Profession */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Candidates by Profession</h2>
          <div className="space-y-3">
            {topProfessions.map(([profession, count]) => (
              <div key={profession}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 truncate pr-2">{profession}</span>
                  <span className="text-slate-500 font-medium flex-shrink-0">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxProfessionCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By German Level */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Candidates by German Language Level</h2>
          <div className="space-y-3">
            {byGermanLevel.map(({ level, count, color }) => (
              <div key={level}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">Level {level}</span>
                  <span className="text-slate-500">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${(count / maxGermanCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Candidates */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Recent Candidates
          </h2>
          <button
            onClick={() => onNavigate('candidates')}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium transition"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.map((c) => (
            <button
              key={c.id}
              onClick={() => onCandidateClick(c)}
              className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition text-left"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {c.photo_url ? (
                  <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">
                    {c.first_name[0]}{c.last_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-slate-500">{c.profession} · {c.candidate_id}</p>
              </div>
              <div className="hidden sm:block text-xs text-slate-500 mr-4">
                DE: {c.german_level} · {c.years_experience} yrs
              </div>
              <AvailabilityBadge status={c.availability} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
