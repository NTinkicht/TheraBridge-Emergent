import {
  Activity, Baby, BookOpen, Building2, CalendarDays, CalendarRange, ClipboardList, FileText, Flag, Gauge, Home,
  Inbox, LayoutDashboard, LifeBuoy, MailPlus, MessageSquare, Package, Receipt, Repeat, Settings, Smile, Sparkles,
  UserCircle, Users, type LucideIcon,
} from 'lucide-react';

export type WorkspaceKey = 'platform' | 'center' | 'therapist' | 'family';
export interface NavItem { key: string; label: string; icon: LucideIcon; href?: string }
export interface Workspace { tone: 'clinical' | 'family'; context: string; role: string; user: string; items: NavItem[]; mobile: string[] }

const P = '/design-preview';

export const WORKSPACES: Record<WorkspaceKey, Workspace> = {
  platform: {
    tone: 'clinical', context: 'TheraBridge platform', role: 'Platform administrator', user: 'Nadia Ortiz',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, href: `${P}/platform` },
      { key: 'applications', label: 'Center applications', icon: Inbox },
      { key: 'centers', label: 'Centers', icon: Building2 },
      { key: 'plans', label: 'Plans & trials', icon: Gauge },
      { key: 'users', label: 'Platform users', icon: Users },
      { key: 'events', label: 'Operational events', icon: Activity },
      { key: 'support', label: 'Support', icon: LifeBuoy },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
    mobile: ['overview', 'applications', 'centers', 'events'],
  },
  center: {
    tone: 'clinical', context: 'Cedar Grove Kids Clinic', role: 'Center administrator', user: 'Maya Chen',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, href: `${P}/center` },
      { key: 'children', label: 'Children', icon: Baby },
      { key: 'invitations', label: 'Invitations', icon: MailPlus },
      { key: 'calendar', label: 'Calendar', icon: CalendarDays },
      { key: 'packages', label: 'Packages', icon: Package },
      { key: 'replacements', label: 'Replacements', icon: Repeat },
      { key: 'billing', label: 'Billing', icon: Receipt },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
    mobile: ['overview', 'children', 'invitations', 'calendar'],
  },
  therapist: {
    tone: 'clinical', context: 'Harbor Child Development Center', role: 'Therapist · Speech, OT', user: 'Leila Hassan',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: `${P}/therapist` },
      { key: 'calendar', label: 'Calendar', icon: CalendarDays },
      { key: 'children', label: 'Children', icon: Baby, href: `${P}/child` },
      { key: 'sessions', label: 'Sessions', icon: ClipboardList },
      { key: 'reports', label: 'Reports', icon: FileText },
      { key: 'plans', label: 'Weekly plans', icon: CalendarRange },
      { key: 'messages', label: 'Messages', icon: MessageSquare },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
    mobile: ['dashboard', 'calendar', 'children', 'sessions'],
  },
  family: {
    tone: 'family', context: 'Alex’s care at Harbor', role: 'Guardian', user: 'Sara Morgan',
    items: [
      { key: 'home', label: 'Home', icon: Home, href: `${P}/family` },
      { key: 'child', label: 'My child', icon: Smile },
      { key: 'plan', label: 'Home plan', icon: BookOpen },
      { key: 'activities', label: 'Activities', icon: Sparkles },
      { key: 'progress', label: 'Progress', icon: Flag },
      { key: 'messages', label: 'Messages', icon: MessageSquare },
      { key: 'account', label: 'Account', icon: UserCircle },
    ],
    mobile: ['home', 'plan', 'activities', 'progress'],
  },
};
