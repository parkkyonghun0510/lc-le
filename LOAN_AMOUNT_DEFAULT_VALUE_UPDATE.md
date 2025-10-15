# Loan Amount Default Value Update

## Summary
Updated both backend validation and frontend default value for the loan amount field to improve user experience and ensure proper validation.

## Backend Changes

### 1. Schema Update (`le-backend/app/schemas.py`)
- **Changed**: `requested_amount: Optional[float] = None` 
- **To**: `requested_amount: float = Field(..., gt=0, description="Loan amount must be greater than 0")`
- **Impact**: Field is now required and must be greater than 0 at the Pydantic validation level

### 2. Validation Logic Update (`le-backend/app/routers/applications.py`)
- **Changed**: `if not application.requested_amount or application.requested_amount <= 0:`
- **To**: `if application.requested_amount is None or application.requested_amount <= 0:`
- **Impact**: More explicit None checking instead of relying on truthiness

## Frontend Changes

### 1. Default Value (`lc-workflow-frontend/app/applications/new/page.tsx`)
- **Changed**: `requested_amount: '',`
- **To**: `requested_amount: '5000.0',`
- **Impact**: New loan applications now start with a sensible default amount

### 2. Type Fixes (`lc-workflow-frontend/app/applications/new/components/DocumentAttachmentStep.tsx`)
- **Fixed**: `getBackendDocumentType` function return type to use proper `DocumentType` values
- **Impact**: Resolved TypeScript compilation errors

### 3. Document Type Mapping (`lc-workflow-frontend/src/lib/upload/BulkCategoryOperations.ts`)
- **Updated**: Size limits object to include all `DocumentType` values
- **Impact**: Proper type safety for file upload size validation

## Benefits

### User Experience
- **Reduced Friction**: Users see a reasonable default (5000.0 KHR) instead of empty field
- **Faster Form Completion**: No need to think about what amount to enter initially
- **Clear Expectations**: Default value shows the expected format and magnitude

### Data Quality
- **Required Field**: Backend now enforces that loan amount must be provided
- **Positive Values**: Validation ensures amount is greater than 0
- **Type Safety**: Frontend has proper TypeScript types for all document operations

### Developer Experience
- **Consistent Validation**: Both frontend and backend validate the same requirements
- **Clear Error Messages**: Specific validation errors for different scenarios
- **Type Safety**: No more TypeScript compilation errors

## Validation Rules

The loan amount now follows these validation rules:

1. **Required**: Field cannot be empty or null
2. **Positive**: Must be greater than 0
3. **Range**: Must be between 100 and 1,000,000 (backend business logic)
4. **Format**: Must be a valid number

## Testing

### Backend Testing
```bash
python test_loan_amount_validation.py
```

### Frontend Testing
```bash
node test_frontend_default_value.js
```

### Build Verification
```bash
cd lc-workflow-frontend && npm run build
```

## Migration Notes

- **No Breaking Changes**: Existing applications with valid loan amounts are unaffected
- **New Applications**: Will start with 5000.0 default value
- **API Consumers**: Must now provide a valid loan amount (> 0) when creating applications
- **Form Validation**: Frontend will show validation errors for invalid amounts

## Error Scenarios Handled

1. **Missing Amount**: Returns 422 validation error from Pydantic
2. **Zero Amount**: Returns 400 "Valid loan amount is required (must be greater than 0)"
3. **Negative Amount**: Returns 400 "Valid loan amount is required (must be greater than 0)"
4. **Too Small**: Returns 400 "Loan amount must be at least $100"
5. **Too Large**: Returns 400 "Loan amount cannot exceed $1,000,000"

## Files Modified

### Backend
- `le-backend/app/schemas.py`
- `le-backend/app/routers/applications.py`

### Frontend
- `lc-workflow-frontend/app/applications/new/page.tsx`
- `lc-workflow-frontend/app/applications/new/components/DocumentAttachmentStep.tsx`
- `lc-workflow-frontend/src/lib/upload/BulkCategoryOperations.ts`

### Test Files Created
- `test_loan_amount_validation.py`
- `test_frontend_default_value.js`