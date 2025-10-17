// Custom hooks
export { default as useLocalStorage } from './useLocalStorage';
export { default as useDebounce } from './useDebounce';
export { default as useOnlineStatus } from './useOnlineStatus';
export { default as useDraftSaving, useDraftSaving as default, useCleanupOldDrafts, cleanupOldDrafts } from './useDraftSaving';

// Employee hooks
export {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  employeeKeys,
  type EmployeeFilters,
} from './useEmployees';

// Employee assignment hooks
export {
  useApplicationAssignments,
  useEmployeeAssignments,
  useAssignEmployee,
  useUpdateAssignment,
  useRemoveAssignment,
  assignmentKeys,
} from './useEmployeeAssignments';

// Employee workload hooks
export {
  useEmployeeWorkload,
  useWorkloadSummary,
  workloadKeys,
  type WorkloadFilters,
  type EmployeeWorkload,
  type WorkloadSummary,
} from './useEmployeeWorkload';

// Employee code management hooks
export {
  useNextEmployeeCode,
  useCheckEmployeeCode,
  useGenerateEmployeeCodes,
} from './useEmployeeCode';

// Permission checking hooks
export {
  usePermissionCheck,
  permissionCheckKeys,
  createPermissionName,
  parsePermissionName,
  type UsePermissionCheckReturn,
} from './usePermissionCheck';