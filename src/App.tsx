import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout, { type NavItem } from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CandidatesPage from '@/pages/CandidatesPage';
import CandidateProfilePage from '@/pages/CandidateProfilePage';
import CandidateFormPage from '@/pages/CandidateFormPage';
import RequestsPage from '@/pages/RequestsPage';
import PartnersPage from '@/pages/PartnersPage';
import SettingsPage from '@/pages/SettingsPage';
import ShortlistPage from '@/pages/ShortlistPage';
import ReadyForProcessPage from '@/pages/ReadyForProcessPage';
import type { Candidate } from '@/types';
import {
  LayoutDashboard, Users, Building2, Settings, ClipboardList, UserCircle,
  Star, CheckCircle2,
} from 'lucide-react';

type Page =
  | { name: 'dashboard' }
  | { name: 'candidates' }
  | { name: 'candidateProfile'; candidate: Candidate }
  | { name: 'candidateForm'; candidate?: Candidate }
  | { name: 'requests' }
  | { name: 'partners' }
  | { name: 'settings' }
  | { name: 'shortlist' }
  | { name: 'readyForProcess' };

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>({ name: 'dashboard' });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  const isAdmin = profile.role === 'admin';

  const adminNav: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'candidates', label: 'Candidates', icon: Users },
    { key: 'requests', label: 'Requests', icon: ClipboardList },
    { key: 'partners', label: 'Partners', icon: Building2 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const partnerNav: NavItem[] = [
    { key: 'candidates', label: 'Candidates', icon: Users },
    { key: 'shortlist', label: 'Shortlist', icon: Star },
    { key: 'readyForProcess', label: 'Ready for Process', icon: CheckCircle2 },
    { key: 'requests', label: 'My Requests', icon: ClipboardList },
    { key: 'settings', label: 'Profile', icon: UserCircle },
  ];

  const navItems = isAdmin ? adminNav : partnerNav;
  const activeKey = page.name === 'candidateProfile' || page.name === 'candidateForm' ? 'candidates' : page.name;

  function navigate(key: string) {
    setPage({ name: key as Page['name'] } as Page);
  }

  function renderPage() {
    switch (page.name) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={navigate}
            onCandidateClick={(c) => setPage({ name: 'candidateProfile', candidate: c })}
          />
        );
      case 'candidates':
        return (
          <CandidatesPage
            onCandidateClick={(c) => setPage({ name: 'candidateProfile', candidate: c })}
            onAddCandidate={isAdmin ? () => setPage({ name: 'candidateForm' }) : undefined}
            canEdit={isAdmin}
          />
        );
      case 'candidateProfile':
        return (
          <CandidateProfilePage
            candidate={page.candidate}
            onBack={() => setPage({ name: 'candidates' })}
            onEdit={isAdmin ? (c) => setPage({ name: 'candidateForm', candidate: c }) : undefined}
            onDelete={isAdmin ? () => {} : undefined}
            canEdit={isAdmin}
          />
        );
      case 'candidateForm':
        return (
          <CandidateFormPage
            candidate={page.candidate}
            onBack={() => setPage({ name: 'candidates' })}
            onSaved={() => setPage({ name: 'candidates' })}
          />
        );
      case 'shortlist':
        return <ShortlistPage onCandidateClick={(c) => setPage({ name: 'candidateProfile', candidate: c })} />;
      case 'readyForProcess':
        return <ReadyForProcessPage onCandidateClick={(c) => setPage({ name: 'candidateProfile', candidate: c })} />;
      case 'requests':
        return <RequestsPage onCandidateClick={(c) => setPage({ name: 'candidateProfile', candidate: c })} />;
      case 'partners':
        return <PartnersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  }

  return (
    <Layout navItems={navItems} activeKey={activeKey} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
