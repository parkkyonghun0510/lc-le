# Implementation Plan

## Backend Implementation

- [x] 1. Enhance EmployeeService with code management methods
  - [x] 1.1 Implement get_next_available_code method
    - Query all existing employee codes from database
    - Detect code pattern (sequential, prefix-based, etc.)
    - Calculate next available code based on pattern
    - Handle edge case when no employees exist (return "0001")
    - Support optional pattern parameter
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Implement check_code_availability method
    - Query database for employee with given code
    - Return availability status (boolean)
    - If code exists, include existing employee's basic info (id, names)
    - Return structured response: { available: bool, existing_employee: Optional[dict] }
    - _Requirements: 2.4, 7.2, 7.3, 7.4_
  
  - [x] 1.3 Implement generate_code_batch method
    - Accept count parameter (validate max 100)
    - Generate sequential available codes
    - Ensure no conflicts with existing codes
    - Follow configured or detected pattern
    - Return list of generated codes
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 1.4 Implement detect_code_pattern helper method
    - Analyze list of existing employee codes
    - Detect common patterns: sequential numbers, prefix-year-seq, department-seq
    - Return pattern string (e.g., "sequential_numeric", "prefix_year_seq")
    - Handle mixed patterns by selecting most common
    - _Requirements: 1.2, 1.3_
  
  - [x] 1.5 Implement validate_code_format helper method
    - Accept code and optional pattern parameter
    - Validate code matches expected format
    - Return boolean (valid/invalid)
    - Support alphanumeric validation when no pattern specified
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 2. Add new API endpoints to employees router
  - [x] 2.1 Create GET /api/v1/employees/next-code endpoint
    - Accept optional pattern query parameter
    - Call EmployeeService.get_next_available_code()
    - Return NextCodeResponse schema: { code: str, pattern: str }
    - Require authentication (any authenticated user)
    - Add response caching (30 seconds)
    - _Requirements: 1.1, 1.5_
  
  - [x] 2.2 Create GET /api/v1/employees/check-code/{code} endpoint
    - Accept code as path parameter
    - Call EmployeeService.check_code_availability()
    - Return CodeAvailabilityResponse schema
    - Require authentication
    - Add rate limiting (prevent abuse)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 2.3 Create POST /api/v1/employees/generate-codes endpoint
    - Accept GenerateCodesRequest schema: { count: int, pattern: Optional[str] }
    - Validate count is between 1 and 100
    - Call EmployeeService.generate_code_batch()
    - Return GeneratedCodesResponse schema: { codes: List[str], count: int, expires_at: Optional[datetime] }
    - Require manage_employees permission
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 2.4 Enhance POST /api/v1/employees/ endpoint error handling
    - Wrap existing create logic in try-except
    - Catch HTTPException with status 409 (duplicate code)
    - Call get_next_available_code() to get suggestion
    - Call get_employee_by_code() to get existing employee info
    - Raise enhanced HTTPException with detail dict containing: message, suggested_code, existing_employee
    - Ensure backward compatibility (still return 409 status)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Add Pydantic schemas for new endpoints
  - [x] 3.1 Create NextCodeResponse schema
    - Define fields: code (str), pattern (str)
    - Add to schemas.py
    - _Requirements: 1.1_
  
  - [x] 3.2 Create CodeAvailabilityResponse schema
    - Define fields: available (bool), code (str), existing_employee (Optional[EmployeeBasicInfo])
    - Add to schemas.py
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [x] 3.3 Create EmployeeBasicInfo schema
    - Define fields: id (UUID), full_name_khmer (str), full_name_latin (str)
    - Add to schemas.py
    - _Requirements: 2.4, 2.5_
  
  - [x] 3.4 Create GenerateCodesRequest schema
    - Define fields: count (int with ge=1, le=100), pattern (Optional[str])
    - Add validation for count range
    - Add to schemas.py
    - _Requirements: 6.1, 6.3_
  
  - [x] 3.5 Create GeneratedCodesResponse schema
    - Define fields: codes (List[str]), count (int), expires_at (Optional[datetime])
    - Add to schemas.py
    - _Requirements: 6.1, 6.5_

## Frontend Implementation

- [x] 4. Create employee code management hooks
  - [x] 4.1 Create useNextEmployeeCode hook (src/hooks/useEmployeeCode.ts)
    - Use useQuery from @tanstack/react-query
    - Query key: ['next-employee-code']
    - Call GET /api/v1/employees/next-code
    - Set staleTime to 30 seconds
    - Return { data, isLoading, error, refetch }
    - _Requirements: 1.1, 3.1_
  
  - [x] 4.2 Create useCheckEmployeeCode hook (src/hooks/useEmployeeCode.ts)
    - Accept code parameter (string)
    - Use useQuery with dynamic query key: ['check-employee-code', code]
    - Call GET /api/v1/employees/check-code/{code}
    - Set enabled to false if code is empty
    - Set staleTime to 10 seconds
    - Return { data, isLoading, error }
    - _Requirements: 7.1, 7.2_
  
  - [x] 4.3 Create useGenerateEmployeeCodes hook (src/hooks/useEmployeeCode.ts)
    - Use useMutation from @tanstack/react-query
    - Accept request: { count: number, pattern?: string }
    - Call POST /api/v1/employees/generate-codes
    - Return mutation object with mutate, isLoading, error
    - _Requirements: 6.1_
  
  - [x] 4.4 Export hooks from index (src/hooks/index.ts)
    - Add export statements for useNextEmployeeCode, useCheckEmployeeCode, useGenerateEmployeeCodes
    - Ensure hooks are accessible via import from '@/hooks'
    - _Requirements: 1.1, 7.1, 6.1_

- [x] 5. Enhance EmployeeFormModal component
  - [x] 5.1 Add auto-fill employee code on modal open
    - Import useNextEmployeeCode hook
    - Add useEffect that triggers when modal opens in create mode
    - Call useNextEmployeeCode to fetch next available code
    - Auto-populate employee_code field with fetched code
    - Do NOT auto-fill in edit mode
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 5.2 Implement real-time code availability checking
    - Import useCheckEmployeeCode hook and useMemo for debouncing
    - Create local state for codeAvailability: { checking: bool, available: bool | null, existingEmployee?: object }
    - Implement debounced function (500ms) that calls useCheckEmployeeCode
    - Trigger debounced check on employee_code input change
    - Only check in create mode, skip in edit mode
    - Update codeAvailability state with results
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 5.3 Add availability indicator to employee code field
    - Add absolute positioned div inside employee_code FormField
    - Show Loader2 spinner icon when checking
    - Show CheckCircle2 green icon when available
    - Show XCircle red icon when not available
    - Only show indicators in create mode
    - _Requirements: 7.3, 7.4_
  
  - [x] 5.4 Implement duplicate error display with suggestion
    - Add local state for suggestedCode: string | null
    - Create handleSubmitError function to parse 409 error response
    - Extract suggested_code and existing_employee from error.response.data.detail
    - Update suggestedCode state and codeAvailability state
    - Display Alert component below employee_code field when code is not available
    - Show existing employee's name (Khmer and Latin)
    - Show suggested code with "Use This Code" button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.5 Add "Use Suggested Code" functionality
    - Create useSuggestedCode function
    - On button click, update employee_code field value with suggestedCode
    - Clear suggestedCode state
    - Update codeAvailability to available: true
    - Clear any error messages
    - _Requirements: 4.4, 4.5_
  
  - [x] 5.6 Add "Suggest Code" button for empty field
    - Show button when employee_code field is empty in create mode
    - Button text: "Suggest Code" with Sparkles icon
    - On click, call useNextEmployeeCode refetch
    - Populate field with fetched code
    - _Requirements: 3.3_
  
  - [x] 5.7 Handle code input changes
    - Create handleCodeChange function
    - Update employee_code field value
    - Clear suggestedCode when user manually types
    - Trigger debounced availability check
    - _Requirements: 3.2, 7.1_

- [x] 6. Add TypeScript types for new API responses
  - [x] 6.1 Add types to src/types/models.ts
    - Define NextCodeResponse: { code: string; pattern: string }
    - Define CodeAvailabilityResponse: { available: boolean; code: string; existing_employee?: EmployeeBasicInfo }
    - Define EmployeeBasicInfo: { id: string; full_name_khmer: string; full_name_latin: string }
    - Define GenerateCodesRequest: { count: number; pattern?: string }
    - Define GeneratedCodesResponse: { codes: string[]; count: number; expires_at?: string }
    - Export all new types
    - _Requirements: 1.1, 2.5, 6.1_

- [x] 7. Update API client with new endpoints
  - [x] 7.1 Add API functions to src/lib/api.ts or relevant API client file
    - Add getNextEmployeeCode(): Promise<NextCodeResponse>
    - Add checkEmployeeCodeAvailability(code: string): Promise<CodeAvailabilityResponse>
    - Add generateEmployeeCodes(request: GenerateCodesRequest): Promise<GeneratedCodesResponse>
    - Use existing axios/fetch instance with proper error handling
    - _Requirements: 1.1, 7.2, 6.1_

## Testing

- [ ]* 8. Backend unit tests
  - [ ]* 8.1 Test EmployeeService code management methods
    - Test get_next_available_code with no existing employees
    - Test get_next_available_code with sequential codes
    - Test get_next_available_code with pattern parameter
    - Test check_code_availability for available code
    - Test check_code_availability for taken code
    - Test generate_code_batch with various counts
    - Test detect_code_pattern with different patterns
    - Test validate_code_format with valid and invalid codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 6.1, 6.2, 7.2_
  
  - [ ]* 8.2 Test new API endpoints
    - Test GET /api/v1/employees/next-code returns correct code
    - Test GET /api/v1/employees/check-code/{code} for available code
    - Test GET /api/v1/employees/check-code/{code} for taken code
    - Test POST /api/v1/employees/generate-codes with valid count
    - Test POST /api/v1/employees/generate-codes with count > 100 (should fail)
    - Test enhanced POST /api/v1/employees/ duplicate error response
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 6.1, 6.3, 7.2, 7.3_

- [ ]* 9. Frontend component tests
  - [ ]* 9.1 Test EmployeeFormModal enhancements
    - Test auto-fill employee code on modal open (create mode)
    - Test no auto-fill in edit mode
    - Test real-time availability checking with debounce
    - Test availability indicator display (loading, available, taken)
    - Test duplicate error display with suggestion
    - Test "Use Suggested Code" button functionality
    - Test "Suggest Code" button for empty field
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.3, 7.4_
  
  - [ ]* 9.2 Test employee code hooks
    - Test useNextEmployeeCode fetches and returns code
    - Test useCheckEmployeeCode checks availability
    - Test useGenerateEmployeeCodes generates batch
    - Test hook caching behavior
    - _Requirements: 1.1, 6.1, 7.1, 7.2_

---

## Summary

This implementation plan enhances the employee code management UX with:

### Backend Enhancements
- ✅ Smart next code suggestion based on pattern detection
- ✅ Real-time code availability checking
- ✅ Bulk code generation for imports
- ✅ Enhanced duplicate error responses with suggestions

### Frontend Enhancements
- ✅ Auto-fill employee code on form open
- ✅ Real-time availability indicators
- ✅ Inline duplicate errors with actionable suggestions
- ✅ One-click code suggestion and usage

### Key Features
- Pattern detection (sequential, prefix-based, etc.)
- Debounced availability checks (500ms)
- Caching for performance (30s for next code, 10s for availability)
- Graceful error handling with user-friendly messages
- Backward compatible with existing functionality

### User Experience Improvements
- Reduces friction during employee creation
- Prevents duplicate code errors proactively
- Provides clear guidance when errors occur
- Maintains flexibility for manual code entry
