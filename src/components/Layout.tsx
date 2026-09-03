import { useAuth } from '@/context/AuthContext';
import { LogOut, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface LayoutProps {
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}

export default function Layout({ navItems, activeKey, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-30 hidden md:flex">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800">
          <img
            src="/Aim_Genius_New_(2).png"
            alt="Aim Genius"
            className="w-10 h-10 object-contain flex-shrink-0"
          />
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Aim Genius</p>
            <p className="text-slate-400 text-xs">Candidate Database</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || profile?.email}</p>
              <p className="text-slate-400 text-xs capitalize">
                {profile?.role === 'admin' ? 'Administrator' : 'Recruiting Partner'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/Aim_Genius_New_(2).png"
            alt="Aim Genius"
            className="w-7 h-7 object-contain"
          />
          <span className="text-white font-bold text-sm">Aim Genius</span>
        </div>
        <button onClick={signOut} className="text-slate-400 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                active ? 'text-brand-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
