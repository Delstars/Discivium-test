import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  ClipboardList,
  Wallet,
  Award,
  Sparkles,
  Building2,
  MessageSquare,
  Palette,
  Bell,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  X,
  HelpCircle,
  ShieldCheck,
  Users,
  Calendar,
  Command,
  ArrowRight,
} from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';
import { ASSETS } from '../data/seedData';
import type { UserRole } from '../lib/discivium-rules';

interface NavGroup {
  group: string;
  items: { id: string; label: string; icon: React.ReactNode }[];
}

const ROLE_NAV: Record<UserRole, NavGroup[]> = {
  student: [
    {
      group: 'Core Hub',
      items: [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'courses', label: 'My Modules', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'assignments', label: 'Assignments', icon: <FileCheck2 className="w-4 h-4" /> },
        { id: 'registration', label: 'Registration', icon: <ClipboardList className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Campus & Finance',
      items: [
        { id: 'finance', label: 'Student Finance', icon: <Wallet className="w-4 h-4" /> },
        { id: 'services', label: 'Campus Services', icon: <Building2 className="w-4 h-4" /> },
        { id: 'workspace', label: 'Chat & Forms', icon: <MessageSquare className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Intelligence & Record',
      items: [
        { id: 'ai-coach', label: 'AI Study Coach', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'passport', label: 'Scholar Passport', icon: <Award className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
      ],
    },
  ],
  lecturer: [
    {
      group: 'Teaching Hub',
      items: [
        { id: 'dashboard', label: 'Productivity Hub', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'gradebook', label: 'Assignments & Grading', icon: <FileCheck2 className="w-4 h-4" /> },
        { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Intelligence & Workspace',
      items: [
        { id: 'ai-copilot', label: 'AI Co-Pilot', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'workspace', label: 'Chat & Forms', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
      ],
    },
  ],
  admin: [
    {
      group: 'Institutional Terminal',
      items: [
        { id: 'dashboard', label: 'Campus Pulse', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'structure', label: 'Academic Structure', icon: <Calendar className="w-4 h-4" /> },
        { id: 'people', label: 'People & Services', icon: <Users className="w-4 h-4" /> },
        { id: 'finance', label: 'Finance & Ledger', icon: <Wallet className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Governance & Compliance',
      items: [
        { id: 'governance', label: 'Flags & Audit Log', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
      ],
    },
  ],
  advisor: [
    {
      group: 'Mirror & Progress',
      items: [
        { id: 'dashboard', label: 'Mirror View', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'history', label: 'History & Digest', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'consent', label: 'Wellbeing & Consent', icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Support & Finance',
      items: [
        { id: 'ai-support', label: 'AI Digest', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'finance', label: 'Tuition & Chat', icon: <Wallet className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
      ],
    },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    authMode,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    accentColor,
    courses,
    assignments,
    notifications,
    markAllNotificationsRead,
    switchRole,
    logout,
  } = useDiscivium();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!user) return null;

  const navGroups = ROLE_NAV[user.role];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const flatNavItems = navGroups.flatMap((g) => g.items);

  const filteredNavItems = flatNavItems.filter(
    (i) => !paletteFilter || i.label.toLowerCase().includes(paletteFilter.toLowerCase())
  );
  const filteredCourses = courses.filter(
    (c) =>
      !paletteFilter ||
      `${c.code} ${c.title}`.toLowerCase().includes(paletteFilter.toLowerCase())
  );
  const filteredAssignments = assignments.filter(
    (a) => !paletteFilter || a.title.toLowerCase().includes(paletteFilter.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1E2535] text-slate-100 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={ASSETS.passportCrest}
            alt="Discivium"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
          {!collapsed && (
            <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap truncate">
              Discivium
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav aria-label="Primary Sidebar" className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[11px] font-medium text-slate-400 tracking-wide">
                {group.group}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                    style={
                      isActive
                        ? { boxShadow: `inset 3px 0 0 ${accentColor}` }
                        : undefined
                    }
                  >
                    <span style={isActive ? { color: accentColor } : undefined}>{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/5">
          <img
            src={user.role === 'lecturer' ? ASSETS.lecturerAvatar : ASSETS.studentAvatar}
            alt={user.displayName}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                {user.scholarOsId}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--canvas-bg)] text-[var(--text-primary)]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--surface-bg)]/95 backdrop-blur border-b border-[var(--border-hairline)] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search modules, assignments, students, or documents"
                placeholder="Search modules or records..."
                className="w-full pl-9 pr-2 sm:pr-14 py-2 text-xs sm:text-sm rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open Quick Command Palette"
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[var(--border-hairline)] bg-[var(--surface-bg)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <Command className="w-2.5 h-2.5" />K
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <label className="sr-only" htmlFor="role-switcher">
              Active Portal Role
            </label>
            <select
              id="role-switcher"
              value={user.role}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="max-w-[126px] sm:max-w-none px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer truncate"
            >
              <option value="student">Student View</option>
              <option value="lecturer">Lecturer View</option>
              <option value="admin">Registrar / Admin</option>
              <option value="advisor">Advisor / Guardian</option>
            </select>

            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-label="Architecture and workflow help"
              className="p-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative p-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-semibold text-white flex items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Contextual Help Callout (only when toggled) */}
        {helpOpen && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--border-hairline)] flex items-start justify-between gap-4">
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p className="font-semibold text-[var(--text-primary)]">
                Discivium Modular Architecture · {authMode === 'google' ? 'Live Cloud Session' : 'Persistent Local + Cloud Workspace'}
              </p>
              <p>
                Switch roles in the top bar or press <span className="font-mono">⌘K</span> to test
                the complete academic lifecycle: Lecturer publishes coursework, Student submits a
                PDF or DOCX response, and Lecturer scores multi-criterion rubrics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close help panel"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Command Palette Modal (⌘K) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick Command Palette"
            className="w-full max-w-lg rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--border-hairline)] flex items-center gap-3">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                autoFocus
                value={paletteFilter}
                onChange={(e) => setPaletteFilter(e.target.value)}
                placeholder="Jump to portal tab, module, assignment, or role..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close command palette"
                className="p-1 rounded-lg hover:bg-[var(--surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-4 text-xs">
              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                  Portal Navigation
                </p>
                <div className="space-y-1">
                  {filteredNavItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] text-left"
                    >
                      <span className="inline-flex items-center gap-2 font-medium">
                        {item.icon}
                        {item.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                  ))}
                </div>
              </div>

              {filteredCourses.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    University Modules
                  </p>
                  <div className="space-y-1">
                    {filteredCourses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(c.code);
                          setActiveTab('courses');
                          setPaletteOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] text-left"
                      >
                        <span>
                          <strong className="font-mono mr-2">{c.code}</strong>
                          {c.title}
                        </span>
                        <span className="font-mono text-[var(--text-muted)]">{c.credits} cr</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredAssignments.length > 0 && user.role === 'student' && (
                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    Coursework Deliverables
                  </p>
                  <div className="space-y-1">
                    {filteredAssignments.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('assignments');
                          setPaletteOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] text-left"
                      >
                        <span className="truncate">{a.title}</span>
                        <span className="font-mono text-[var(--text-muted)]">
                          Due {new Date(a.dueAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                  Switch Active Portal Role
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['student', 'Student Portal'],
                      ['lecturer', 'Lecturer / Faculty'],
                      ['admin', 'Registrar / Admin'],
                      ['advisor', 'Advisor / Guardian'],
                    ] as const
                  ).map(([r, label]) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        switchRole(r);
                        setPaletteOpen(false);
                      }}
                      className="px-3 py-2 rounded-xl bg-[var(--surface-subtle)] hover:opacity-90 text-left font-medium"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Notification Panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/40" onClick={() => setNotifOpen(false)} />
          <aside
            aria-label="Notification Panel"
            className="relative z-10 w-full max-w-sm bg-[var(--surface-bg)] border-l border-[var(--border-hairline)] h-full flex flex-col p-6 shadow-xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-hairline)]">
              <h2 className="font-display text-lg font-bold">Notifications</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs font-medium text-[var(--text-secondary)] hover:underline"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  aria-label="Close notifications"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)] mt-2">
              {notifications.map((n) => (
                <div key={n.id} className="py-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{n.category}</span>
                    <span className="font-mono">{n.time}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{n.body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
