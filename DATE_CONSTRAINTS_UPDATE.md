# Date Constraints Update - Application Form

## Summary
Added date constraints to the application form (both new and edit pages) to ensure data integrity:

### 1. Date of Birth (ថ្ងៃខែឆ្នាំកំណើត)
- **Constraint**: Maximum date is 18 years ago from today
- **Purpose**: Ensures applicants are at least 18 years old
- **Implementation**: `max` attribute set to current date minus 18 years

### 2. Disbursement Date (កាលបរិច្ឆេទ ទទួលប្រាក់)
- **Constraint**: Minimum date is tomorrow
- **Purpose**: Prevents selecting past dates or today for disbursement
- **Implementation**: `min` attribute set to tomorrow's date

## Files Modified

### 1. New Application Form
- `lc-workflow-frontend/app/applications/new/components/CustomerInformationStep.tsx`
  - Added `max` constraint to date_of_birth field (18 years ago)
  
- `lc-workflow-frontend/app/applications/new/components/LoanInformationStep.tsx`
  - Added `min` constraint to requested_disbursement_date field (tomorrow)

### 2. Edit Application Form
- `lc-workflow-frontend/app/applications/[id]/edit/page.tsx`
  - Added `max` constraint to date_of_birth field (18 years ago)
  - Added `min` constraint to requested_disbursement_date field (tomorrow)

## Technical Details

### Date Calculation Logic
```javascript
// For Date of Birth (max = 18 years ago)
max={(() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().split('T')[0];
})()}

// For Disbursement Date (min = tomorrow)
min={(() => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
})()}
```

## User Experience
- Users cannot select dates beyond the constraints using the date picker
- If users manually type invalid dates, the browser will show validation errors
- The constraints are enforced on both create and edit forms for consistency

## Testing Recommendations
1. Try selecting a date of birth less than 18 years ago - should be blocked
2. Try selecting today or a past date for disbursement - should be blocked
3. Verify the date picker shows appropriate date ranges
4. Test on different browsers to ensure consistent behavior
