'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AccountLockoutManagement } from '@/components/auth';

export default function SecurityPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Layout>
        <div className="p-6">
          <AccountLockoutManagement />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
