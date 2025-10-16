'use client';

import React, { useState, useMemo } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import useDebounce from '@/hooks/useDebounce';
import { EmployeeAssignmentCreate, AssignmentRole } from '@/types/models';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { X } from 'lucide-react';

interface EmployeeSelectorProps {
  value: EmployeeAssignmentCreate[];
  onChange: (assignments: EmployeeAssignmentCreate[]) => void;
  branchId?: string;
  allowMultiple?: boolean;
}

// Role display configuration
const ROLE_CONFIG: Record<AssignmentRole, { label: string; color: string }> = {
  primary_officer: { label: 'Primary Officer', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  secondary_officer: { label: 'Secondary Officer', color: 'bg-green-100 text-green-800 border-green-300' },
  field_officer: { label: 'Field Officer', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  reviewer: { label: 'Reviewer', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  approver: { label: 'Approver', color: 'bg-red-100 text-red-800 border-red-300' },
};

const ROLE_OPTIONS: { value: AssignmentRole; label: string }[] = [
  { value: 'primary_officer', label: 'Primary Officer' },
  { value: 'secondary_officer', label: 'Secondary Officer' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'approver', label: 'Approver' },
];

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  value = [],
  onChange,
  branchId,
  allowMultiple = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch employees with filters
  const { data: employeesData, isLoading } = useEmployees({
    search: debouncedSearch || undefined,
    branch_id: branchId,
    is_active: true,
    size: 50,
  });

  const employees = employeesData?.items || [];

  // Filter out already selected employees
  const availableEmployees = useMemo(() => {
    const selectedIds = new Set(value.map(a => a.employee_id));
    return employees.filter(emp => !selectedIds.has(emp.id));
  }, [employees, value]);

  // Handle employee selection
  const handleSelectEmployee = (employeeId: string) => {
    if (!allowMultiple && value.length > 0) {
      // Replace existing assignment
      onChange([{
        employee_id: employeeId,
        assignment_role: 'primary_officer',
        notes: '',
      }]);
    } else {
      // Add new assignment
      onChange([
        ...value,
        {
          employee_id: employeeId,
          assignment_role: 'primary_officer',
          notes: '',
        },
      ]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  // Handle role change for an assignment
  const handleRoleChange = (index: number, role: AssignmentRole) => {
    const updated = [...value];
    updated[index] = { ...updated[index], assignment_role: role };
    onChange(updated);
  };

  // Handle removing an assignment
  const handleRemoveAssignment = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Get employee details by ID
  const getEmployeeById = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId);
  };

  return (
    <div className="space-y-3">
      {/* Search/Select Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assign Employees
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search employees by name or code..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!allowMultiple && value.length > 0}
          />
          
          {/* Dropdown */}
          {isDropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : availableEmployees.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    {branchId 
                      ? 'No employees found in this branch'
                      : 'No employees found'}
                  </div>
                ) : (
                  <ul>
                    {availableEmployees.map((employee) => (
                      <li
                        key={employee.id}
                        onClick={() => handleSelectEmployee(employee.id)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        <div className="font-medium text-gray-900">
                          {employee.full_name_khmer} ({employee.full_name_latin})
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.employee_code}
                          {employee.position && ` • ${employee.position}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Employees */}
      {value.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Selected Employees ({value.length})
          </label>
          <div className="space-y-2">
            {value.map((assignment, index) => {
              const employee = getEmployeeById(assignment.employee_id);
              if (!employee) return null;

              return (
                <div
                  key={`${assignment.employee_id}-${index}`}
                  className={`flex items-center gap-2 p-3 border rounded-lg ${
                    ROLE_CONFIG[assignment.assignment_role].color
                  }`}
                >
                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {employee.full_name_khmer} ({employee.full_name_latin})
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {employee.employee_code}
                      {employee.position && ` • ${employee.position}`}
                    </div>
                  </div>

                  {/* Role Selector */}
                  <select
                    value={assignment.assignment_role}
                    onChange={(e) => handleRoleChange(index, e.target.value as AssignmentRole)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Remove assignment"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!allowMultiple && value.length === 0 && (
        <p className="text-xs text-gray-500">
          Select one employee to assign
        </p>
      )}
      {allowMultiple && (
        <p className="text-xs text-gray-500">
          You can assign multiple employees with different roles
        </p>
      )}
    </div>
  );
};
