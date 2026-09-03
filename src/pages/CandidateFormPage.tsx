import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Candidate, CandidateInput, GermanLevel, Availability } from '@/types';
import { GERMAN_LEVELS, AVAILABILITY_OPTIONS } from '@/types';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';

interface CandidateFormPageProps {
  candidate?: Candidate;
  onBack: () => void;
  onSaved: (candidate: Candidate) => void;
}

export default function CandidateFormPage({ candidate, onBack, onSaved }: CandidateFormPageProps) {
  const { profile } = useAuth();
  const isEdit = !!candidate;

  const [form, setForm] = useState<CandidateInput>({
    first_name: candidate?.first_name ?? '',
    last_name: candidate?.last_name ?? '',
    age: candidate?.age ?? 25,
    nationality: candidate?.nationality ?? '',
    location: candidate?.location ?? '',
    german_level: candidate?.german_level ?? 'B1',
    english_level: candidate?.english_level ?? 'B2',
    other_languages: candidate?.other_languages ?? '',
    profession: candidate?.profession ?? '',
    years_experience: candidate?.years_experience ?? 0,
    education: candidate?.education ?? '',
    professional_experience: candidate?.professional_experience ?? '',
    additional_qualifications: candidate?.additional_qualifications ?? '',
    availability: candidate?.availability ?? 'available',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(candidate?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let photoUrl = candidate?.photo_url ?? null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `photos/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('candidate-photos')
          .upload(path, photoFile);
        if (uploadErr) throw new Error('Failed to upload photo: ' + uploadErr.message);
        photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/candidate-photos/${path}`;
      }

      if (isEdit && candidate) {
        const { data, error: updateErr } = await supabase
          .from('candidates')
          .update({ ...form, photo_url: photoUrl })
          .eq('id', candidate.id)
          .select('*')
          .maybeSingle();
        if (updateErr) throw updateErr;
        if (data) onSaved(data as Candidate);
      } else {
        const candidateId = `CAND-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const { data, error: insertErr } = await supabase
          .from('candidates')
          .insert({
            ...form,
            candidate_id: candidateId,
            photo_url: photoUrl,
            created_by: profile?.id,
          })
          .select('*')
          .maybeSingle();
        if (insertErr) throw insertErr;
        if (data) onSaved(data as Candidate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save candidate');
      setSaving(false);
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
        {isEdit ? 'Edit Candidate' : 'Add New Candidate'}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {isEdit ? 'Update candidate information' : 'Enter the candidate\'s details to add them to the database'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className={labelClass}>Candidate Photo</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl font-bold">
                  ?
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                {photoFile ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              {photoFile && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(candidate?.photo_url ?? null); }}
                  className="ml-2 text-sm text-slate-400 hover:text-red-600"
                >
                  <X className="w-4 h-4 inline" />
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1.5">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Personal Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Age *</label>
              <input type="number" min="18" max="80" value={form.age} onChange={(e) => update('age', Number(e.target.value))} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nationality</label>
              <input value={form.nationality} onChange={(e) => update('nationality', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Berlin, Germany" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Other Languages</label>
              <input value={form.other_languages ?? ''} onChange={(e) => update('other_languages', e.target.value || null)} placeholder="e.g. Spanish (B1), French (A2)" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Professional info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Professional Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Profession / Desired Position *</label>
              <input value={form.profession} onChange={(e) => update('profession', e.target.value)} required placeholder="e.g. Senior Software Engineer" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Years of Experience *</label>
              <input type="number" min="0" max="50" value={form.years_experience} onChange={(e) => update('years_experience', Number(e.target.value))} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Availability</label>
              <select value={form.availability} onChange={(e) => update('availability', e.target.value as Availability)} className={inputClass}>
                {AVAILABILITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>German Level</label>
              <select value={form.german_level} onChange={(e) => update('german_level', e.target.value as GermanLevel)} className={inputClass}>
                {GERMAN_LEVELS.map((l) => <option key={l} value={l}>{l === 'None' ? 'None' : `Level ${l}`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>English Level</label>
              <select value={form.english_level} onChange={(e) => update('english_level', e.target.value as GermanLevel)} className={inputClass}>
                {GERMAN_LEVELS.map((l) => <option key={l} value={l}>{l === 'None' ? 'None' : `Level ${l}`}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Background & Qualifications</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Education</label>
              <textarea value={form.education ?? ''} onChange={(e) => update('education', e.target.value || null)} rows={2} placeholder="e.g. M.Sc. Computer Science, TU Munich" className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Professional Experience</label>
              <textarea value={form.professional_experience ?? ''} onChange={(e) => update('professional_experience', e.target.value || null)} rows={3} placeholder="Previous roles, companies, years..." className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Additional Qualifications</label>
              <textarea value={form.additional_qualifications ?? ''} onChange={(e) => update('additional_qualifications', e.target.value || null)} rows={2} placeholder="Certifications, special skills, training..." className={inputClass + ' resize-none'} />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Add Candidate'}
          </button>
        </div>
      </form>
    </div>
  );
}
