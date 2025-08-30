'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="min-h-full">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div className="lg:pl-64">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="py-10 bg-white dark:bg-gray-900">
            <div className="px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-white">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}