export type UserRole = 'admin' | 'recruiting_partner';

export type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'None';

export type Availability = 'available' | 'placed' | 'unavailable' | 'pending';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'placed';

export type DocumentType = 'cv' | 'language_certificate' | 'education_certificate' | 'work_certificate' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  candidate_id: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  location: string;
  german_level: GermanLevel;
  english_level: GermanLevel;
  other_languages: string | null;
  profession: string;
  years_experience: number;
  education: string | null;
  professional_experience: string | null;
  additional_qualifications: string | null;
  availability: Availability;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

export interface CandidateRequest {
  id: string;
  candidate_id: string;
  partner_id: string;
  status: RequestStatus;
  message: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  responded_by: string | null;
  candidate?: Candidate;
  partner?: Profile;
}

export interface ShortlistItem {
  id: string;
  partner_id: string;
  candidate_id: string;
  created_at: string;
  candidate?: Candidate;
}

export interface ReadyForProcessItem {
  id: string;
  partner_id: string;
  candidate_id: string;
  created_at: string;
  candidate?: Candidate;
}

export interface CandidateVideo {
  id: string;
  candidate_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

export interface CandidateInput {
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  location: string;
  german_level: GermanLevel;
  english_level: GermanLevel;
  other_languages: string | null;
  profession: string;
  years_experience: number;
  education: string | null;
  professional_experience: string | null;
  additional_qualifications: string | null;
  availability: Availability;
}

export const GERMAN_LEVELS: GermanLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'None'];

export const AVAILABILITY_OPTIONS: { value: Availability; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'placed', label: 'Placed', color: 'blue' },
  { value: 'unavailable', label: 'Unavailable', color: 'gray' },
];

export const REQUEST_STATUS_OPTIONS: { value: RequestStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'placed', label: 'Placed', color: 'blue' },
];

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'cv', label: 'CV' },
  { value: 'language_certificate', label: 'Language Certificate' },
  { value: 'education_certificate', label: 'Education Certificate' },
  { value: 'work_certificate', label: 'Work Certificate' },
  { value: 'other', label: 'Other' },
];
