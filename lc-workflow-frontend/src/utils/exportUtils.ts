/**
 * Export Utilities
 * 
 * Utilities for exporting data in various formats:
 * - CSV export
 * - JSON export
 * - Excel-compatible CSV
 * - PDF export (basic)
 */

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: any, item: T) => string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export.csv'
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create CSV header
  const headers = columns.map((col) => escapeCSVValue(col.label)).join(',');

  // Create CSV rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = getNestedValue(item, col.key as string);
        const formatted = col.format ? col.format(value, item) : value;
        return escapeCSVValue(String(formatted ?? ''));
      })
      .join(',');
  });

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');

  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, filename);
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(
  data: T[],
  filename: string = 'export.json',
  pretty: boolean = true
): void {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Export data to Excel-compatible format
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export.xlsx'
): void {
  // For now, use CSV with .xlsx extension
  // In production, consider using a library like xlsx or exceljs
  exportToCSV(data, columns, filename.replace('.xlsx', '.csv'));
}

/**
 * Export permission matrix to CSV
 */
export function exportMatrixToCSV(
  roles: Array<{ id: string; name: string }>,
  permissions: Array<{ id: string; name: string }>,
  assignments: Record<string, string[]>,
  filename: string = 'permission-matrix.csv'
): void {
  // Create header row with role names
  const headers = ['Permission', ...roles.map((r) => r.name)];
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Create data rows
  const rows = permissions.map((permission) => {
    const cells = [permission.name];
    roles.forEach((role) => {
      const hasPermission = assignments[role.id]?.includes(permission.id);
      cells.push(hasPermission ? 'Yes' : 'No');
    });
    return cells.map(escapeCSVValue).join(',');
  });

  const csv = [headerRow, ...rows].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export audit trail to CSV
 */
export function exportAuditTrailToCSV(
  entries: Array<{
    timestamp: string;
    action: string;
    user_name?: string;
    target_user_name?: string;
    permission_name?: string;
    role_name?: string;
    reason?: string;
    ip_address?: string;
  }>,
  filename: string = 'audit-trail.csv'
): void {
  const columns: ExportColumn<any>[] = [
    { key: 'timestamp', label: 'Timestamp', format: (v) => new Date(v).toLocaleString() },
    { key: 'action', label: 'Action' },
    { key: 'user_name', label: 'User' },
    { key: 'target_user_name', label: 'Target User' },
    { key: 'permission_name', label: 'Permission' },
    { key: 'role_name', label: 'Role' },
    { key: 'reason', label: 'Reason' },
    { key: 'ip_address', label: 'IP Address' },
  ];

  exportToCSV(entries, columns, filename);
}

/**
 * Export roles with permissions to CSV
 */
export function exportRolesWithPermissions(
  roles: Array<{
    name: string;
    description: string;
    level: number;
    permissions?: Array<{ name: string }>;
  }>,
  filename: string = 'roles-permissions.csv'
): void {
  const data = roles.map((role) => ({
    name: role.name,
    description: role.description,
    level: role.level,
    permissions: role.permissions?.map((p) => p.name).join('; ') || '',
    permission_count: role.permissions?.length || 0,
  }));

  const columns: ExportColumn<any>[] = [
    { key: 'name', label: 'Role Name' },
    { key: 'description', label: 'Description' },
    { key: 'level', label: 'Level' },
    { key: 'permission_count', label: 'Permission Count' },
    { key: 'permissions', label: 'Permissions' },
  ];

  exportToCSV(data, columns, filename);
}

/**
 * Export user permissions to CSV
 */
export function exportUserPermissions(
  users: Array<{
    name: string;
    email: string;
    roles?: Array<{ name: string }>;
    permissions?: Array<{ name: string; source: string }>;
  }>,
  filename: string = 'user-permissions.csv'
): void {
  const data = users.map((user) => ({
    name: user.name,
    email: user.email,
    roles: user.roles?.map((r) => r.name).join('; ') || '',
    role_count: user.roles?.length || 0,
    direct_permissions: user.permissions?.filter((p) => p.source === 'direct').length || 0,
    total_permissions: user.permissions?.length || 0,
  }));

  const columns: ExportColumn<any>[] = [
    { key: 'name', label: 'User Name' },
    { key: 'email', label: 'Email' },
    { key: 'role_count', label: 'Role Count' },
    { key: 'roles', label: 'Roles' },
    { key: 'direct_permissions', label: 'Direct Permissions' },
    { key: 'total_permissions', label: 'Total Permissions' },
  ];

  exportToCSV(data, columns, filename);
}

// Helper functions

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy data to clipboard in various formats
 */
export async function copyToClipboard(
  data: any[],
  format: 'json' | 'csv' | 'text' = 'text'
): Promise<void> {
  let text: string;

  switch (format) {
    case 'json':
      text = JSON.stringify(data, null, 2);
      break;
    case 'csv':
      // Simple CSV conversion
      text = data
        .map((item) =>
          Object.values(item)
            .map((v) => String(v ?? ''))
            .join(',')
        )
        .join('\n');
      break;
    default:
      text = data.map((item) => JSON.stringify(item)).join('\n');
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw err;
  }
}

/**
 * Print data as a formatted table
 */
export function printTable<T>(
  data: T[],
  columns: ExportColumn<T>[],
  title?: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Print'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background-color: #f9fafb; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${title ? `<h1>${title}</h1>` : ''}
        <table>
          <thead>
            <tr>
              ${columns.map((col) => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (item) => `
              <tr>
                ${columns
                  .map((col) => {
                    const value = getNestedValue(item, col.key as string);
                    const formatted = col.format ? col.format(value, item) : value;
                    return `<td>${formatted ?? ''}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
          Print
        </button>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
