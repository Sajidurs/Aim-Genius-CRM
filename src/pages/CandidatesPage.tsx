import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Candidate, GermanLevel, Availability } from '@/types';
import { GERMAN_LEVELS, AVAILABILITY_OPTIONS } from '@/types';
import CandidateCard from '@/components/CandidateCard';
import { Search, LayoutGrid, List, SlidersHorizontal, X, Plus } from 'lucide-react';

interface CandidatesPageProps {
  onCandidateClick: (candidate: Candidate) => void;
  onAddCandidate?: () => void;
  canEdit: boolean;
}

type SortOption = 'newest' | 'name' | 'experience_desc' | 'experience_asc';

export default function CandidatesPage({ onCandidateClick, onAddCandidate, canEdit }: CandidatesPageProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [germanFilter, setGermanFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

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

  const professions = useMemo(() => {
    const set = new Set(candidates.map((c) => c.profession));
    return Array.from(set).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    let result = [...candidates];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.profession.toLowerCase().includes(q) ||
        c.candidate_id.toLowerCase().includes(q) ||
        c.nationality.toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q)
      );
    }
    if (professionFilter !== 'all') result = result.filter((c) => c.profession === professionFilter);
    if (germanFilter !== 'all') result = result.filter((c) => c.german_level === germanFilter);
    if (availabilityFilter !== 'all') result = result.filter((c) => c.availability === availabilityFilter);
    if (experienceFilter !== 'all') {
      const [min, max] = experienceFilter.split('-').map(Number);
      result = result.filter((c) => c.years_experience >= min && (max === -1 || c.years_experience <= max));
    }

    switch (sortBy) {
      case 'name': result.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)); break;
      case 'experience_desc': result.sort((a, b) => b.years_experience - a.years_experience); break;
      case 'experience_asc': result.sort((a, b) => a.years_experience - b.years_experience); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [candidates, search, professionFilter, germanFilter, experienceFilter, availabilityFilter, sortBy]);

  const activeFilterCount = [professionFilter, germanFilter, experienceFilter, availabilityFilter].filter((f) => f !== 'all').length;

  function clearFilters() {
    setProfessionFilter('all');
    setGermanFilter('all');
    setExperienceFilter('all');
    setAvailabilityFilter('all');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidates</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} of {candidates.length} candidates</p>
        </div>
        {canEdit && onAddCandidate && (
          <button
            onClick={onAddCandidate}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
        )}
      </div>

      {/* Search + sort + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, profession, ID, nationality..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="newest">Newest first</option>
          <option value="name">Name (A-Z)</option>
          <option value="experience_desc">Experience (high to low)</option>
          <option value="experience_asc">Experience (low to high)</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
            showFilters || activeFilterCount > 0
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{activeFilterCount}</span>
          )}
        </button>
        <div className="flex border border-slate-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2.5 transition ${view === 'grid' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2.5 transition ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Filter candidates</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Profession</label>
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All professions</option>
                {professions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">German Level</label>
              <select
                value={germanFilter}
                onChange={(e) => setGermanFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All levels</option>
                {GERMAN_LEVELS.filter((l) => l !== 'None').map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Experience</label>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All experience</option>
                <option value="0-3">0-3 years</option>
                <option value="4-7">4-7 years</option>
                <option value="8-12">8-12 years</option>
                <option value="13--1">13+ years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Availability</label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as Availability | 'all')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All statuses</option>
                {AVAILABILITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium text-slate-500">No candidates found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} onClick={() => onCandidateClick(c)} view="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} onClick={() => onCandidateClick(c)} view="list" />
          ))}
        </div>
      )}
    </div>
  );
}
