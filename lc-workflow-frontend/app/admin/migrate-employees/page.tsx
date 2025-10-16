'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MigrationStatus {
  total_applications: number;
  migrated_applications: number;
  pending_applications: number;
  total_employees: number;
  active_employees: number;
}

interface MigrationReport {
  total: number;
  matched: number;
  created: number;
  failed: number;
  errors: string[];
}

interface MigrationResult {
  success: boolean;
  message: string;
  report: MigrationReport;
}

interface UnmatchedName {
  application_id: string;
  portfolio_officer_name: string;
  created_at: string;
}

export default function MigrateEmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch migration status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<MigrationStatus>({
    queryKey: ['migration-status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/migration-status', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch migration status');
      }
      return response.json();
    },
    enabled: user?.role === 'admin',
  });

  // Fetch unmatched names
  const { data: unmatchedNames, isLoading: unmatchedLoading, refetch: refetchUnmatched } = useQuery<UnmatchedName[]>({
    queryKey: ['unmatched-names'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/unmatched-names', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch unmatched names');
      }
      return response.json();
    },
    enabled: user?.role === 'admin',
  });

  // Start migration mutation
  const startMigrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/admin/migrate-employees', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Migration failed');
      }
      return response.json();
    },
    onSuccess: (data: MigrationResult) => {
      setMigrationResult(data);
      setMigrationInProgress(false);
      if (data.success) {
        toast.success('Migration completed successfully');
      } else {
        toast.error('Migration completed with errors');
      }
      refetchStatus();
      refetchUnmatched();
    },
    onError: (error: Error) => {
      setMigrationInProgress(false);
      toast.error(`Migration failed: ${error.message}`);
    },
  });

  // Revert migration mutation
  const revertMigrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/admin/revert-migration', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Revert failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Migration reverted: ${data.assignments_deactivated} assignments deactivated`);
      setMigrationResult(null);
      refetchStatus();
      refetchUnmatched();
    },
    onError: (error: Error) => {
      toast.error(`Revert failed: ${error.message}`);
    },
  });

  // Manual match mutation
  const manualMatchMutation = useMutation({
    mutationFn: async ({ applicationId, employeeId }: { applicationId: string; employeeId: string }) => {
      const response = await fetch('/api/v1/admin/manual-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          application_id: applicationId,
          employee_id: employeeId,
        }),
      });
      if (!response.ok) {
        throw new Error('Manual match failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Manual match created successfully');
      refetchStatus();
      refetchUnmatched();
    },
    onError: (error: Error) => {
      toast.error(`Manual match failed: ${error.message}`);
    },
  });

  const handleStartMigration = () => {
    setMigrationInProgress(true);
    setMigrationResult(null);
    startMigrationMutation.mutate();
  };

  const handleRevertMigration = () => {
    revertMigrationMutation.mutate();
  };

  const calculateProgress = () => {
    if (!status) return 0;
    if (status.total_applications === 0) return 100;
    return (status.migrated_applications / status.total_applications) * 100;
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Employee Migration</h1>
          <p className="text-muted-foreground mt-2">
            Migrate legacy portfolio officer names to structured employee assignments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchStatus();
            refetchUnmatched();
          }}
          disabled={statusLoading || unmatchedLoading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Migration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.total_applications || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Migrated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {status?.migrated_applications || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Migration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {status?.pending_applications || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migration Progress</CardTitle>
          <CardDescription>
            Overall progress of portfolio officer migration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={calculateProgress()} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{status?.migrated_applications || 0} migrated</span>
              <span>{calculateProgress().toFixed(1)}%</span>
              <span>{status?.pending_applications || 0} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migration Actions</CardTitle>
          <CardDescription>
            Start or revert the employee migration process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Before you start</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The migration process will:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Match portfolio officer names to existing employees using fuzzy matching</li>
                  <li>Create new employee records for unmatched names</li>
                  <li>Create employee assignments with role "Primary Officer"</li>
                  <li>Mark applications as migrated</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleStartMigration}
              disabled={migrationInProgress || startMigrationMutation.isPending || (status?.pending_applications || 0) === 0}
              className="flex-1"
            >
              {migrationInProgress || startMigrationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migration in Progress...
                </>
              ) : (
                'Start Migration'
              )}
            </Button>

            <Button
              variant="error"
              onClick={() => {
                if (window.confirm('Are you absolutely sure? This will deactivate all employee assignments created during migration and reset the migration status. This action cannot be undone.')) {
                  handleRevertMigration();
                }
              }}
              disabled={revertMigrationMutation.isPending || (status?.migrated_applications || 0) === 0}
            >
              Revert Migration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Result */}
      {migrationResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Migration Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
                <div className="text-2xl font-bold">{migrationResult.report.total}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Matched</div>
                <div className="text-2xl font-bold text-blue-600">
                  {migrationResult.report.matched}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-2xl font-bold text-green-600">
                  {migrationResult.report.created}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {migrationResult.report.failed}
                </div>
              </div>
            </div>

            {migrationResult.report.errors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Errors:</h4>
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto">
                  {migrationResult.report.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unmatched Names */}
      {unmatchedNames && unmatchedNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Portfolio Officer Names</CardTitle>
            <CardDescription>
              These applications have portfolio officer names that could not be automatically matched.
              You can manually assign employees to these applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Application ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Portfolio Officer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {unmatchedNames.map((item) => (
                    <tr key={item.application_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                        {item.application_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.portfolio_officer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/applications/${item.application_id}`)}
                        >
                          View Application
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {unmatchedNames && unmatchedNames.length === 0 && status && status.pending_applications === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Applications Migrated</h3>
            <p className="text-muted-foreground">
              All portfolio officer names have been successfully migrated to employee assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
