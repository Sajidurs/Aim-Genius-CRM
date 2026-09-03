import type { Candidate } from '@/types';
import { AvailabilityBadge } from '@/components/Badges';
import { MapPin, Briefcase, Languages, Award } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
  view: 'grid' | 'list';
}

export default function CandidateCard({ candidate, onClick, view }: CandidateCardProps) {
  const fullName = `${candidate.first_name} ${candidate.last_name}`;

  if (view === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition text-left"
      >
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          {candidate.photo_url ? (
            <img src={candidate.photo_url} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-semibold">
              {candidate.first_name[0]}{candidate.last_name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div>
            <p className="font-semibold text-slate-900 text-sm truncate">{fullName}</p>
            <p className="text-xs text-slate-500">{candidate.candidate_id}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-slate-700 truncate">{candidate.profession}</p>
            <p className="text-xs text-slate-500">{candidate.years_experience} yrs exp.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
            <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">DE: {candidate.german_level}</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">EN: {candidate.english_level}</span>
          </div>
          <div className="flex justify-end">
            <AvailabilityBadge status={candidate.availability} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition text-left group"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {candidate.photo_url ? (
          <img src={candidate.photo_url} alt={fullName} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl font-bold">
            {candidate.first_name[0]}{candidate.last_name[0]}
          </div>
        )}
        <div className="absolute top-3 right-3">
          <AvailabilityBadge status={candidate.availability} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-slate-900 text-sm">{fullName}</h3>
          <span className="text-xs text-slate-400 font-mono">{candidate.candidate_id}</span>
        </div>
        <p className="text-sm text-slate-600 mb-3 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          {candidate.profession}
        </p>
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            {candidate.years_experience} years experience · Age {candidate.age}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {candidate.location || candidate.nationality}
          </div>
          <div className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">DE: {candidate.german_level}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">EN: {candidate.english_level}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
