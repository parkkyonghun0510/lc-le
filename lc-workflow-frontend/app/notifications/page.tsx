'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationManagement } from '@/components/notifications';

export default function NotificationsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <Layout>
        <div className="p-6">
          <NotificationManagement />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
