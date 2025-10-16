# Design Document

## Overview

This enhancement improves the employee code management user experience by adding intelligent code suggestion, real-time availability checking, and enhanced error handling. The design focuses on reducing friction during employee creation while maintaining data integrity and uniqueness constraints.

**Key Design Principles:**
- Proactive assistance: Auto-suggest codes before errors occur
- Clear feedback: Provide actionable error messages with solutions
- Flexibility: Allow users to override suggestions when needed
- Performance: Use debouncing and caching to minimize API calls
- Backward compatibility: Enhance existing functionality without breaking changes

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Employee Form Modal (Enhanced)                       │   │
│  │  - Auto-fill employee code on open                   │   │
│  │  - Real-time availability check (debounced)          │   │
│  │  - Inline error with suggested code                  │   │
│  │  - "Use Suggested Code" button                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (New Endpoints)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GET  /api/v1/employees/next-code                     │   │
│  │ GET  /api/v1/employees/check-code/{code}             │   │
│  │ POST /api/v1/employees/generate-codes                │   │
│  │ POST /api/v1/employees/ (Enhanced error response)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer (Enhanced)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ EmployeeCodeService                                   │   │
│  │  - get_next_available_code()                         │   │
│  │  - check_code_availability()                         │   │
│  │  - generate_code_batch()                             │   │
│  │  - detect_code_pattern()                             │   │
│  │  - validate_code_format()                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Employee Model (Existing)                            │   │
│  │  - Query for max employee_code                       │   │
│  │  - Check code existence                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### 1. Enhanced Employee Service (`le-backend/app/services/employee_service.py`)

Add new methods to the existing `EmployeeService` class:

```python
class EmployeeService:
    """Enhanced service for employee management operations"""
    
    @staticmethod
    async def get_next_available_code(
        db: AsyncSession,
        pattern: Optional[str] = None
    ) -> str:
        """
        Get the next available employee code
        
        Args:
            db: Database session
            pattern: Optional code pattern (e.g., "EMP-{year}-{seq}")
        
        Returns:
            Next available employee code
        
        Logic:
        1. Query all existing employee codes
        2. If pattern provided, use it; otherwise detect pattern
        3. Extract numeric sequence from codes
        4. Return next sequential code
        """
        
    @staticmethod
    async def check_code_availability(
        db: AsyncSession,
        code: str
    ) -> Dict[str, Any]:
        """
        Check if an employee code is available
        
        Returns:
            {
                "available": bool,
                "existing_employee": Optional[EmployeeResponse]
            }
        """
        
    @staticmethod
    async def generate_code_batch(
        db: AsyncSession,
        count: int,
        pattern: Optional[str] = None
    ) -> List[str]:
        """
        Generate a batch of available employee codes
        
        Args:
            count: Number of codes to generate (max 100)
            pattern: Optional code pattern
        
        Returns:
            List of available employee codes
        """
        
    @staticmethod
    def detect_code_pattern(codes: List[str]) -> str:
        """
        Detect the most common code pattern from existing codes
        
        Patterns:
        - Sequential numbers: "0001", "0002", "0003"
        - Prefix with year: "EMP-2025-001", "EMP-2025-002"
        - Department prefix: "IT-001", "HR-001"
        
        Returns:
            Detected pattern string
        """
        
    @staticmethod
    def validate_code_format(code: str, pattern: Optional[str] = None) -> bool:
        """
        Validate employee code against format pattern
        
        Returns:
            True if valid, False otherwise
        """
```

#### 2. Enhanced Employee Router (`le-backend/app/routers/employees.py`)

Add new endpoints:

```python
@router.get("/next-code", response_model=schemas.NextCodeResponse)
async def get_next_employee_code(
    pattern: Optional[str] = Query(None, description="Code pattern to follow"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the next available employee code
    
    Returns:
        {
            "code": "0002",
            "pattern": "sequential_numeric"
        }
    """
    
@router.get("/check-code/{code}", response_model=schemas.CodeAvailabilityResponse)
async def check_employee_code_availability(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if an employee code is available
    
    Returns:
        {
            "available": false,
            "code": "0001",
            "existing_employee": {
                "id": "uuid",
                "full_name_khmer": "ឈ្មោះ",
                "full_name_latin": "Name"
            }
        }
    """
    
@router.post("/generate-codes", response_model=schemas.GeneratedCodesResponse)
async def generate_employee_codes(
    request: schemas.GenerateCodesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a batch of available employee codes
    
    Request:
        {
            "count": 10,
            "pattern": "EMP-{year}-{seq}"
        }
    
    Returns:
        {
            "codes": ["EMP-2025-001", "EMP-2025-002", ...],
            "count": 10,
            "expires_at": "2025-10-16T10:30:00Z"
        }
    """
```

#### 3. Enhanced Create Employee Endpoint

Modify the existing create endpoint to return enhanced error response:

```python
@router.post("/", response_model=schemas.EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: schemas.EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new employee with enhanced duplicate error handling
    """
    try:
        # Existing creation logic
        employee = await EmployeeService.create_employee(db, employee_data, current_user.id)
        return employee
    except HTTPException as e:
        if e.status_code == 409:  # Duplicate code
            # Get next available code
            next_code = await EmployeeService.get_next_available_code(db)
            
            # Get existing employee with this code
            existing = await EmployeeService.get_employee_by_code(db, employee_data.employee_code)
            
            # Return enhanced error response
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"Employee with code '{employee_data.employee_code}' already exists",
                    "suggested_code": next_code,
                    "existing_employee": {
                        "id": str(existing.id),
                        "full_name_khmer": existing.full_name_khmer,
                        "full_name_latin": existing.full_name_latin
                    }
                }
            )
        raise
```

#### 4. Pydantic Schemas (`le-backend/app/schemas.py`)

Add new schemas:

```python
class NextCodeResponse(BaseSchema):
    code: str
    pattern: str

class CodeAvailabilityResponse(BaseSchema):
    available: bool
    code: str
    existing_employee: Optional[EmployeeBasicInfo] = None

class EmployeeBasicInfo(BaseSchema):
    id: UUID
    full_name_khmer: str
    full_name_latin: str

class GenerateCodesRequest(BaseSchema):
    count: int = Field(..., ge=1, le=100)
    pattern: Optional[str] = None

class GeneratedCodesResponse(BaseSchema):
    codes: List[str]
    count: int
    expires_at: Optional[datetime] = None

class EnhancedErrorResponse(BaseSchema):
    message: str
    suggested_code: str
    existing_employee: EmployeeBasicInfo
```

### Frontend Components

#### 1. Enhanced Employee Form Modal (`lc-workflow-frontend/src/components/employees/EmployeeFormModal.tsx`)

```typescript
interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee;
  mode: 'create' | 'edit';
}

export function EmployeeFormModal({ open, onClose, employee, mode }: EmployeeFormModalProps) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [codeAvailability, setCodeAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    existingEmployee?: { id: string; full_name_khmer: string; full_name_latin: string };
  }>({ checking: false, available: null });
  const [suggestedCode, setSuggestedCode] = useState<string | null>(null);
  
  // Auto-fetch next code on modal open (create mode only)
  useEffect(() => {
    if (open && mode === 'create') {
      fetchNextCode();
    }
  }, [open, mode]);
  
  // Debounced availability check
  const debouncedCheckAvailability = useMemo(
    () => debounce(async (code: string) => {
      if (!code || mode === 'edit') return;
      
      setCodeAvailability({ checking: true, available: null });
      
      try {
        const result = await checkEmployeeCodeAvailability(code);
        setCodeAvailability({
          checking: false,
          available: result.available,
          existingEmployee: result.existing_employee
        });
      } catch (error) {
        setCodeAvailability({ checking: false, available: null });
      }
    }, 500),
    [mode]
  );
  
  // Handle code input change
  const handleCodeChange = (value: string) => {
    setEmployeeCode(value);
    setSuggestedCode(null); // Clear suggestion when user types
    debouncedCheckAvailability(value);
  };
  
  // Handle duplicate error from API
  const handleSubmitError = (error: any) => {
    if (error.response?.status === 409 && error.response?.data?.detail) {
      const detail = error.response.data.detail;
      setSuggestedCode(detail.suggested_code);
      setCodeAvailability({
        checking: false,
        available: false,
        existingEmployee: detail.existing_employee
      });
    }
  };
  
  // Use suggested code
  const useSuggestedCode = () => {
    if (suggestedCode) {
      setEmployeeCode(suggestedCode);
      setSuggestedCode(null);
      setCodeAvailability({ checking: false, available: true });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Employee' : 'Edit Employee'}</DialogTitle>
        </DialogHeader>
        
        <Form>
          {/* Employee Code Field with Enhanced UX */}
          <FormField
            name="employee_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee Code</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      value={employeeCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      disabled={mode === 'edit'}
                    />
                  </FormControl>
                  
                  {/* Availability Indicator */}
                  {mode === 'create' && employeeCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {codeAvailability.checking && <Loader2 className="h-4 w-4 animate-spin" />}
                      {!codeAvailability.checking && codeAvailability.available === true && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {!codeAvailability.checking && codeAvailability.available === false && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Duplicate Error with Suggestion */}
                {codeAvailability.available === false && codeAvailability.existingEmployee && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Code Already Taken</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">
                        Employee code "{employeeCode}" is already used by{' '}
                        <strong>{codeAvailability.existingEmployee.full_name_latin}</strong>
                        {' '}({codeAvailability.existingEmployee.full_name_khmer})
                      </p>
                      {suggestedCode && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Suggested code: <strong>{suggestedCode}</strong></span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={useSuggestedCode}
                          >
                            Use This Code
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Suggest Code Button */}
                {mode === 'create' && !employeeCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchNextCode}
                    className="mt-1"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Suggest Code
                  </Button>
                )}
                
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Other form fields... */}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 2. New React Hooks (`lc-workflow-frontend/src/hooks/useEmployeeCode.ts`)

```typescript
export function useNextEmployeeCode() {
  return useQuery({
    queryKey: ['next-employee-code'],
    queryFn: async () => {
      const response = await api.get('/api/v1/employees/next-code');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCheckEmployeeCode(code: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['check-employee-code', code],
    queryFn: async () => {
      const response = await api.get(`/api/v1/employees/check-code/${code}`);
      return response.data;
    },
    enabled: enabled && !!code,
    staleTime: 10000, // 10 seconds
  });
}

export function useGenerateEmployeeCodes() {
  return useMutation({
    mutationFn: async (request: { count: number; pattern?: string }) => {
      const response = await api.post('/api/v1/employees/generate-codes', request);
      return response.data;
    },
  });
}
```

## Data Flow

### Scenario 1: Creating New Employee (Happy Path)

```
1. User opens employee creation modal
   ↓
2. Frontend calls GET /api/v1/employees/next-code
   ↓
3. Backend analyzes existing codes and returns "0002"
   ↓
4. Frontend auto-fills employee_code field with "0002"
   ↓
5. User fills other fields and submits
   ↓
6. Employee created successfully
```

### Scenario 2: Duplicate Code Error

```
1. User manually enters employee_code "0001"
   ↓
2. Frontend debounces and calls GET /api/v1/employees/check-code/0001
   ↓
3. Backend returns { available: false, existing_employee: {...} }
   ↓
4. Frontend shows red X indicator
   ↓
5. User submits form anyway
   ↓
6. Backend returns 409 with suggested_code "0002"
   ↓
7. Frontend displays inline error with "Use This Code" button
   ↓
8. User clicks button, code changes to "0002"
   ↓
9. User resubmits successfully
```

## Error Handling

### Backend Error Scenarios

1. **Duplicate Code (Enhanced)**
   - HTTP 409 Conflict
   - Response: `{ "detail": { "message": "...", "suggested_code": "0002", "existing_employee": {...} } }`

2. **Invalid Code Format**
   - HTTP 400 Bad Request
   - Message: "Employee code must match pattern: {pattern}"

3. **Batch Generation Limit Exceeded**
   - HTTP 400 Bad Request
   - Message: "Cannot generate more than 100 codes at once"

### Frontend Error Handling

- Display inline validation errors
- Show availability indicators in real-time
- Provide actionable suggestions
- Graceful degradation if API calls fail

## Performance Considerations

### Backend Optimization

1. **Caching**
   - Cache next available code for 30 seconds
   - Invalidate cache on employee creation

2. **Query Optimization**
   - Use `SELECT MAX(employee_code)` for sequential codes
   - Index on employee_code for fast lookups

3. **Rate Limiting**
   - Limit code availability checks to prevent abuse

### Frontend Optimization

1. **Debouncing**
   - 500ms debounce on availability checks
   - Prevent excessive API calls

2. **Query Caching**
   - Cache availability check results for 10 seconds
   - Cache next code suggestion for 30 seconds

3. **Optimistic Updates**
   - Show loading states immediately
   - Don't block user input

## Testing Strategy

### Backend Tests

```python
class TestEmployeeCodeService:
    async def test_get_next_available_code_sequential()
    async def test_get_next_available_code_with_pattern()
    async def test_check_code_availability_available()
    async def test_check_code_availability_taken()
    async def test_generate_code_batch()
    async def test_detect_code_pattern()
    async def test_validate_code_format()

class TestEmployeeCodeAPI:
    async def test_next_code_endpoint()
    async def test_check_code_endpoint()
    async def test_generate_codes_endpoint()
    async def test_create_employee_enhanced_error()
```

### Frontend Tests

```typescript
describe('EmployeeFormModal', () => {
  it('should auto-fill employee code on open')
  it('should check code availability on input')
  it('should display availability indicator')
  it('should show duplicate error with suggestion')
  it('should use suggested code on button click')
})

describe('useEmployeeCode hooks', () => {
  it('should fetch next available code')
  it('should check code availability')
  it('should generate code batch')
})
```

## Migration Strategy

This is an enhancement to existing functionality, no data migration required.

### Deployment Steps

1. Deploy backend changes (new endpoints)
2. Deploy frontend changes (enhanced modal)
3. Monitor error rates and user feedback
4. Adjust code pattern detection if needed

## Future Enhancements

1. **Custom Code Patterns**
   - Allow admins to configure code patterns per department
   - Support multiple pattern formats

2. **Code Reservation System**
   - Reserve generated codes for bulk import
   - Prevent race conditions during batch creation

3. **Smart Pattern Detection**
   - Machine learning to detect complex patterns
   - Suggest optimal patterns based on usage

4. **Code History**
   - Track code assignment history
   - Allow code reuse for deleted employees (optional)
