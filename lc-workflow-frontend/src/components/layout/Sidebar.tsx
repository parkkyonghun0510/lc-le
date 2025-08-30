'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  Cog6ToothIcon,
  FolderIcon,
  XMarkIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { useAuthContext } from '@/providers/AuthProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Applications', href: '/applications', icon: DocumentTextIcon },
  { name: 'Files', href: '/files', icon: FolderIcon },
];

const adminNavigation: NavItem[] = [
  { name: 'Departments', href: '/departments', icon: BuildingOfficeIcon, requiredRoles: ['admin', 'manager'] },
  { name: 'Positions', href: '/positions', icon: BriefcaseIcon, requiredRoles: ['admin', 'manager'] },
  { name: 'Users', href: '/users', icon: UsersIcon, requiredRoles: ['admin', 'manager'] },
  { name: 'Branches', href: '/branches', icon: MapPinIcon, requiredRoles: ['admin', 'manager'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, requiredRoles: ['admin'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, isManager } = useAuthContext();

  const hasRequiredRole = (requiredRoles?: string[]) => {
    if (!requiredRoles) return true;
    return isAdmin || (isManager && requiredRoles.includes('manager'));
  };

  const allNavigation = [...navigation, ...adminNavigation];

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;

    if (!hasRequiredRole(item.requiredRoles)) return null;

    return (
      <Link
        href={item.href}
        className={`group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-all duration-200 ${isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        onClick={onClose}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold text-gray-900 dark:text-white">LC Workflow</div>
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-y-2 p-4">
          {allNavigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 ring-1 ring-gray-200 dark:ring-gray-700">
          <div className="flex h-16 shrink-0 items-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">LC Workflow</div>
          </div>
          <nav className="flex flex-1 flex-col gap-y-2">
            {allNavigation.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>

          {/* User info */}
          {user && (
            <div className="mb-4">
              <div className="flex items-center gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{user.first_name} {user.last_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.role}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}