/**
 * MobileNavigation Component
 * 
 * Mobile-specific navigation patterns for permission management:
 * - Bottom tab bar for main sections
 * - Slide-out drawer for filters
 * - Floating action button
 * - Breadcrumb navigation
 */

'use client';

import React, { useState } from 'react';
import {
  HomeIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  ShieldCheckIcon as ShieldSolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  UsersIcon as UsersSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  ClockIcon as ClockSolidIcon,
} from '@heroicons/react/24/solid';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onActionClick?: () => void;
  actionLabel?: string;
}

const tabs: Tab[] = [
  { id: 'matrix', label: 'Matrix', icon: HomeIcon, iconSolid: HomeSolidIcon },
  { id: 'roles', label: 'Roles', icon: UserGroupIcon, iconSolid: UserGroupSolidIcon },
  { id: 'users', label: 'Users', icon: UsersIcon, iconSolid: UsersSolidIcon },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheckIcon, iconSolid: ShieldSolidIcon },
  { id: 'templates', label: 'Templates', icon: DocumentTextIcon, iconSolid: DocumentSolidIcon },
];

export default function MobileNavigation({
  activeTab,
  onTabChange,
  onActionClick,
  actionLabel = 'Add',
}: MobileNavigationProps) {
  return (
    <>
      {/* Bottom tab bar - visible on mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {tabs.slice(0, 4).map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = isActive ? tab.iconSolid : tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-500'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
          
          {/* More menu button */}
          <MobileMoreMenu
            tabs={tabs.slice(4)}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        </div>
      </div>

      {/* Floating action button */}
      {onActionClick && (
        <button
          onClick={onActionClick}
          className="fixed bottom-20 right-4 md:hidden bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors z-40"
          aria-label={actionLabel}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      {/* Add padding to content to account for bottom nav */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-content-padding {
            padding-bottom: 5rem;
          }
        }
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}

interface MobileMoreMenuProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function MobileMoreMenu({ tabs, activeTab, onTabChange }: MobileMoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveTab = tabs.some((tab) => tab.id === activeTab);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
          hasActiveTab ? 'text-indigo-600' : 'text-gray-500'
        }`}
        aria-label="More options"
      >
        <Bars3Icon className="h-6 w-6" />
        <span className="text-xs mt-1 font-medium">More</span>
      </button>

      {/* Slide-up menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 animate-slide-up">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">More Options</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = isActive ? tab.iconSolid : tab.icon;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-safe-area-bottom" />
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .h-safe-area-bottom {
          height: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}

interface MobileBreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
}

export function MobileBreadcrumb({ items }: MobileBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-4 overflow-x-auto md:hidden">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400">/</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium whitespace-nowrap">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
}

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const positionClasses = {
    left: 'left-0 top-0 bottom-0 w-80 max-w-[85vw]',
    right: 'right-0 top-0 bottom-0 w-80 max-w-[85vw]',
    bottom: 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl',
  };

  const animationClasses = {
    left: 'animate-slide-in-left',
    right: 'animate-slide-in-right',
    bottom: 'animate-slide-up',
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
        onClick={onClose}
      />
      <div
        className={`fixed bg-white z-50 md:hidden ${positionClasses[position]} ${animationClasses[position]}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label="Close drawer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-left {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
