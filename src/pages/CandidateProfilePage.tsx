import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Candidate, CandidateDocument, DocumentType, Availability, CandidateVideo, Profile } from '@/types';
import { DOCUMENT_TYPES, AVAILABILITY_OPTIONS } from '@/types';
import { AvailabilityBadge } from '@/components/Badges';
import {
  ArrowLeft, MapPin, Briefcase, Languages, Award, GraduationCap,
  FileText, Send, Check, Loader2, X, Upload, Trash2, Download, Archive,
  Star, ArrowRight, ArrowLeft as ArrowLeftIcon, Video, Play, Users2, CheckCircle2
} from 'lucide-react';

interface CandidateProfilePageProps {
  candidate: Candidate;
  onBack: () => void;
  onEdit?: (candidate: Candidate) => void;
  onDelete?: (candidate: Candidate) => void;
  canEdit: boolean;
}

export default function CandidateProfilePage({ candidate, onBack, onEdit, onDelete, canEdit }: CandidateProfilePageProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [requestError, setRequestError] = useState('');
  const [existingRequest, setExistingRequest] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('cv');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<Availability>(candidate.availability);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [isReadyForProcess, setIsReadyForProcess] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [shortlistPartners, setShortlistPartners] = useState<Profile[]>([]);
  const [readyPartners, setReadyPartners] = useState<Profile[]>([]);
  const [partnerActivityLoading, setPartnerActivityLoading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      const { data } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('uploaded_at', { ascending: false });
      setDocuments((data as CandidateDocument[]) ?? []);
      setLoadingDocs(false);
    }
    loadDocs();
  }, [candidate.id]);

  useEffect(() => {
    if (profile?.role === 'recruiting_partner') {
      supabase
        .from('candidate_requests')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('partner_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setExistingRequest(!!data));
    }
  }, [candidate.id, profile]);

  useEffect(() => {
    if (profile?.role === 'recruiting_partner') {
      supabase
        .from('partner_shortlist')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('partner_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setIsShortlisted(!!data));
      supabase
        .from('partner_ready_for_process')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('partner_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setIsReadyForProcess(!!data));
    }
  }, [candidate.id, profile]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      setPartnerActivityLoading(true);
      (async () => {
        const [{ data: shortlistRows }, { data: readyRows }] = await Promise.all([
          supabase.from('partner_shortlist').select('partner_id').eq('candidate_id', candidate.id),
          supabase.from('partner_ready_for_process').select('partner_id').eq('candidate_id', candidate.id),
        ]);
        const shortlistIds = (shortlistRows ?? []).map((r: { partner_id: string }) => r.partner_id);
        const readyIds = (readyRows ?? []).map((r: { partner_id: string }) => r.partner_id);
        const allIds = [...new Set([...shortlistIds, ...readyIds])];
        if (allIds.length > 0) {
          const { data: partners } = await supabase.from('profiles').select('*').in('id', allIds);
          const partnerMap = new Map((partners as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
          setShortlistPartners(shortlistIds.map((id) => partnerMap.get(id)).filter((p): p is Profile => !!p));
          setReadyPartners(readyIds.map((id) => partnerMap.get(id)).filter((p): p is Profile => !!p));
        } else {
          setShortlistPartners([]);
          setReadyPartners([]);
        }
        setPartnerActivityLoading(false);
      })();
    }
  }, [candidate.id, profile]);

  useEffect(() => {
    async function loadVideo() {
      const { data } = await supabase
        .from('candidate_videos')
        .select('*')
        .eq('candidate_id', candidate.id)
        .maybeSingle();
      setVideo(data as CandidateVideo | null);
      setVideoLoading(false);
    }
    loadVideo();
  }, [candidate.id]);

  useEffect(() => {
    async function loadVideoUrl() {
      if (video) {
        const { data } = await supabase.storage
          .from('candidate-videos')
          .createSignedUrl(video.file_path, 3600);
        setVideoUrl(data?.signedUrl ?? null);
      } else {
        setVideoUrl(null);
      }
    }
    loadVideoUrl();
  }, [video]);

  async function handleShortlistToggle() {
    if (!profile) return;
    setShortlistLoading(true);
    if (isShortlisted) {
      await supabase
        .from('partner_shortlist')
        .delete()
        .eq('partner_id', profile.id)
        .eq('candidate_id', candidate.id);
      setIsShortlisted(false);
    } else {
      await supabase
        .from('partner_shortlist')
        .insert({ partner_id: profile.id, candidate_id: candidate.id });
      setIsShortlisted(true);
      if (isReadyForProcess) {
        await supabase
          .from('partner_ready_for_process')
          .delete()
          .eq('partner_id', profile.id)
          .eq('candidate_id', candidate.id);
        setIsReadyForProcess(false);
      }
    }
    setShortlistLoading(false);
  }

  async function handleMoveToReady() {
    if (!profile) return;
    setReadyLoading(true);
    await supabase.from('partner_ready_for_process').insert({
      partner_id: profile.id,
      candidate_id: candidate.id,
    });
    await supabase
      .from('partner_shortlist')
      .delete()
      .eq('partner_id', profile.id)
      .eq('candidate_id', candidate.id);
    setIsReadyForProcess(true);
    setIsShortlisted(false);
    setReadyLoading(false);
  }

  async function handleMoveBackToShortlist() {
    if (!profile) return;
    setReadyLoading(true);
    await supabase.from('partner_shortlist').insert({
      partner_id: profile.id,
      candidate_id: candidate.id,
    });
    await supabase
      .from('partner_ready_for_process')
      .delete()
      .eq('partner_id', profile.id)
      .eq('candidate_id', candidate.id);
    setIsShortlisted(true);
    setIsReadyForProcess(false);
    setReadyLoading(false);
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const filePath = `${candidate.id}/${file.name}`;
    if (video) {
      await supabase.storage.from('candidate-videos').remove([video.file_path]);
      await supabase.from('candidate_videos').delete().eq('id', video.id);
    }
    const { error: uploadErr } = await supabase.storage
      .from('candidate-videos')
      .upload(filePath, file);
    if (uploadErr) {
      setUploadingVideo(false);
      return;
    }
    await supabase.from('candidate_videos').insert({
      candidate_id: candidate.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });
    const { data } = await supabase
      .from('candidate_videos')
      .select('*')
      .eq('candidate_id', candidate.id)
      .maybeSingle();
    setVideo(data as CandidateVideo | null);
    setUploadingVideo(false);
  }

  async function handleVideoDelete() {
    if (!video) return;
    await supabase.storage.from('candidate-videos').remove([video.file_path]);
    await supabase.from('candidate_videos').delete().eq('id', video.id);
    setVideo(null);
  }

  async function handleVideoDownload() {
    if (!video) return;
    const { data } = await supabase.storage
      .from('candidate-videos')
      .createSignedUrl(video.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = video.file_name;
      a.click();
    }
  }

  async function handleRequest() {
    if (!profile) return;
    setRequestStatus('loading');
    setRequestError('');
    const { error } = await supabase
      .from('candidate_requests')
      .insert({
        candidate_id: candidate.id,
        partner_id: profile.id,
        message: requestMessage || null,
        status: 'pending',
      });
    if (error) {
      setRequestStatus('error');
      setRequestError(error.message);
    } else {
      setRequestStatus('success');
      setExistingRequest(true);
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const filePath = `${candidate.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('candidate-documents')
      .upload(filePath, file);
    if (uploadErr) {
      setUploadingDoc(false);
      return;
    }
    await supabase.from('candidate_documents').insert({
      candidate_id: candidate.id,
      document_type: uploadDocType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });
    const { data } = await supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidate.id)
      .order('uploaded_at', { ascending: false });
    setDocuments((data as CandidateDocument[]) ?? []);
    setUploadingDoc(false);
  }

  async function handleDocDelete(doc: CandidateDocument) {
    await supabase.storage.from('candidate-documents').remove([doc.file_path]);
    await supabase.from('candidate_documents').delete().eq('id', doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  async function handleAvailabilityChange(newStatus: Availability) {
    setAvailabilityUpdating(true);
    const { data } = await supabase
      .from('candidates')
      .update({ availability: newStatus })
      .eq('id', candidate.id)
      .select('*')
      .maybeSingle();
    if (data) {
      setLocalAvailability(newStatus);
      candidate.availability = newStatus;
    }
    setAvailabilityUpdating(false);
  }

  async function handleDelete() {
    setDeleting(true);
    if (candidate.photo_url) {
      const path = candidate.photo_url.split('/candidate-photos/')[1];
      if (path) await supabase.storage.from('candidate-photos').remove([path]);
    }
    const docsToDelete = documents;
    if (docsToDelete.length > 0) {
      await supabase.storage.from('candidate-documents').remove(docsToDelete.map((d) => d.file_path));
    }
    await supabase.from('candidates').delete().eq('id', candidate.id);
    setDeleting(false);
    setShowDeleteModal(false);
    onBack();
  }

  async function handleDocDownload(doc: CandidateDocument) {
    const { data } = await supabase.storage
      .from('candidate-documents')
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const fullName = `${candidate.first_name} ${candidate.last_name}`;

  const profileInfo = [
    { icon: MapPin, label: 'Location', value: candidate.location },
    { icon: MapPin, label: 'Nationality', value: candidate.nationality },
    { icon: Briefcase, label: 'Desired Position', value: candidate.profession },
    { icon: Award, label: 'Experience', value: `${candidate.years_experience} years` },
    { icon: Award, label: 'Age', value: `${candidate.age} years` },
    { icon: Languages, label: 'German', value: candidate.german_level },
    { icon: Languages, label: 'English', value: candidate.english_level },
    { icon: Languages, label: 'Other Languages', value: candidate.other_languages || '—' },
  ];

  const docsByType = DOCUMENT_TYPES.map((dt) => ({
    ...dt,
    docs: documents.filter((d) => d.document_type === dt.value),
  }));

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to candidates
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-48 h-48 bg-slate-100 flex-shrink-0">
            {candidate.photo_url ? (
              <img src={candidate.photo_url} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-5xl font-bold">
                {candidate.first_name[0]}{candidate.last_name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{candidate.candidate_id}</span>
                </div>
                <p className="text-slate-600 text-sm">{candidate.profession}</p>
              </div>
              <AvailabilityBadge status={candidate.availability} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {profileInfo.slice(0, 8).map((info) => {
                const Icon = info.icon;
                return (
                  <div key={info.label} className="flex items-center gap-2 text-sm">
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{info.label}</p>
                      <p className="text-slate-700 font-medium truncate">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              {profile?.role === 'recruiting_partner' && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  disabled={existingRequest}
                  className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {existingRequest ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {existingRequest ? 'Request Sent' : 'Request Candidate'}
                </button>
              )}
              {profile?.role === 'recruiting_partner' && (
                <button
                  onClick={handleShortlistToggle}
                  disabled={shortlistLoading}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-60 ${
                    isShortlisted
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {shortlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />}
                  {isShortlisted ? 'Shortlisted ✓' : 'Shortlist'}
                </button>
              )}
              {profile?.role === 'recruiting_partner' && isShortlisted && (
                <button
                  onClick={handleMoveToReady}
                  disabled={readyLoading}
                  className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {readyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Ready for Process
                </button>
              )}
              {profile?.role === 'recruiting_partner' && isReadyForProcess && (
                <button
                  onClick={handleMoveBackToShortlist}
                  disabled={readyLoading}
                  className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {readyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftIcon className="w-4 h-4" />}
                  Back to Shortlist
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  onClick={() => onEdit(candidate)}
                  className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50 transition"
                >
                  Edit Profile
                </button>
              )}
              {canEdit && onDelete && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 border border-red-200 text-red-600 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {candidate.education && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              Education
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{candidate.education}</p>
          </div>
        )}
        {candidate.professional_experience && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              Professional Experience
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{candidate.professional_experience}</p>
          </div>
        )}
        {candidate.additional_qualifications && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:col-span-2">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400" />
              Additional Qualifications
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{candidate.additional_qualifications}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Documents
          </h2>
          {canEdit && (
            <div className="flex items-center gap-2">
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {DOCUMENT_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
              <label className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition cursor-pointer">
                {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
                <input type="file" className="hidden" onChange={handleDocUpload} disabled={uploadingDoc} />
              </label>
            </div>
          )}
        </div>

        {loadingDocs ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {docsByType.map(({ value, label, docs }) => docs.length > 0 && (
              <div key={value}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h3>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                      <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB · ` : ''}
                          {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDocDownload(doc)}
                        className="text-slate-400 hover:text-slate-900 transition p-1.5 rounded hover:bg-slate-200"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleDocDelete(doc)}
                          className="text-slate-400 hover:text-red-600 transition p-1.5 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Introduction Video */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-slate-400" />
            Candidate Introduction Video
          </h2>
          {canEdit && (
            <label className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition cursor-pointer">
              {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : video ? <Upload className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {video ? 'Replace Video' : 'Upload Video'}
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleVideoUpload}
                disabled={uploadingVideo}
              />
            </label>
          )}
        </div>

        {videoLoading ? (
          <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
        ) : video ? (
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full max-h-96 object-contain"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Play className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{video.file_name}</p>
                <p className="text-xs text-slate-400">
                  {video.file_size ? `${(video.file_size / (1024 * 1024)).toFixed(1)} MB · ` : ''}
                  {new Date(video.uploaded_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <button
                onClick={handleVideoDownload}
                className="text-slate-400 hover:text-slate-900 transition p-1.5 rounded hover:bg-slate-200"
              >
                <Download className="w-4 h-4" />
              </button>
              {canEdit && (
                <button
                  onClick={handleVideoDelete}
                  className="text-slate-400 hover:text-red-600 transition p-1.5 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Video className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No introduction video uploaded</p>
            {canEdit ? (
              <p className="text-xs mt-1">Upload a video to let partners view this candidate's introduction.</p>
            ) : (
              <p className="text-xs mt-1">The admin has not uploaded an introduction video yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Partner Activity (admin only) */}
      {canEdit && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-slate-400" />
            Partner Activity
          </h2>
          {partnerActivityLoading ? (
            <div className="space-y-3">
              <div className="h-6 bg-slate-100 rounded animate-pulse w-1/3" />
              <div className="h-6 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          ) : shortlistPartners.length === 0 && readyPartners.length === 0 ? (
            <p className="text-sm text-slate-400">No partner activity for this candidate yet.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-brand-600" />
                  Shortlisted by
                </h3>
                {shortlistPartners.length === 0 ? (
                  <p className="text-sm text-slate-400">No partners have shortlisted this candidate.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {shortlistPartners.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                        {p.company_name || p.full_name || p.email}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Ready for Process
                </h3>
                {readyPartners.length === 0 ? (
                  <p className="text-sm text-slate-400">No partners have moved this candidate to Ready for Process.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {readyPartners.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {p.company_name || p.full_name || p.email}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Availability quick-change (admin only) */}
      {canEdit && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">Change Availability Status</h2>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAvailabilityChange(opt.value)}
                disabled={availabilityUpdating || localAvailability === opt.value}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  localAvailability === opt.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {availabilityUpdating && <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-center" />}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-lg">Delete Candidate</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-red-50 rounded-lg p-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Archive className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{fullName}</p>
                <p className="text-xs text-slate-500">{candidate.profession} · {candidate.candidate_id}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete the candidate and all associated documents. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {requestStatus === 'success' ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">Request Submitted</h3>
                <p className="text-sm text-slate-500 mb-6">Your request for {fullName} has been sent to the admin team. You'll be notified once it's reviewed.</p>
                <button onClick={() => setShowRequestModal(false)} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-lg">Request Candidate</h3>
                  <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                    {candidate.photo_url ? (
                      <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">
                        {candidate.first_name[0]}{candidate.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{fullName}</p>
                    <p className="text-xs text-slate-500">{candidate.profession} · {candidate.candidate_id}</p>
                  </div>
                </div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message (optional)</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  placeholder="Add a note about why you're requesting this candidate..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
                {requestStatus === 'error' && (
                  <p className="text-sm text-red-600 mt-2">{requestError}</p>
                )}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequest}
                    disabled={requestStatus === 'loading'}
                    className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition flex items-center justify-center gap-2"
                  >
                    {requestStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
