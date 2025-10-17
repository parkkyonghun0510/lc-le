# Complete Missing Fields Analysis - Application Detail Page

## Overview
This document identifies ALL fields that exist in the backend but are NOT currently displayed in the application detail page UI.

## Currently Displayed Fields ✅

### Customer Information
- ✅ full_name_khmer
- ✅ full_name_latin
- ✅ phone
- ✅ id_card_type
- ✅ id_number
- ✅ date_of_birth
- ✅ current_address (with location codes)

### Loan Details
- ✅ requested_amount
- ✅ desired_loan_term
- ✅ product_type
- ✅ requested_disbursement_date
- ✅ purpose_details

### Guarantor Information
- ✅ guarantor_name
- ✅ guarantor_phone

### Employee/Officer Information
- ✅ employee_assignments (new system)
- ✅ portfolio_officer_name (legacy)

### Documents
- ✅ Uploaded files/documents

---

## Missing Fields ❌

### 1. Personal Information (Customer)
```json
{
  "sex": "male",                    // ❌ NOT displayed
  "marital_status": "married"       // ❌ NOT displayed
}
```

**Where to display**: Customer Information section
**Importance**: Medium - Useful demographic data
**UI Suggestion**: Add as InfoCards in Customer Information grid

---

### 2. Employment Information
```json
{
  "occupation": "Business Owner",           // ❌ NOT displayed
  "employer_name": "ABC Company",           // ❌ NOT displayed
  "monthly_income": 5000000,                // ❌ NOT displayed
  "income_source": "Business Revenue"       // ❌ NOT displayed
}
```

**Where to display**: New "Employment Information" section
**Importance**: HIGH - Critical for loan assessment
**UI Suggestion**: Create new card section after Customer Information

---

### 3. Address Details (Location Codes)
```json
{
  "province": "01",         // ✅ Stored but NOT displayed (only full address shown)
  "district": "0103",       // ✅ Stored but NOT displayed
  "commune": "010304",      // ✅ Stored but NOT displayed
  "village": "01030404"     // ✅ Stored but NOT displayed
}
```

**Status**: Intentionally hidden (codes not user-friendly)
**Current**: Only full address string is shown
**Action**: ✅ Correct - keep as is

---

### 4. Financial Information
```json
{
  "monthly_expenses": 2000000,              // ❌ NOT displayed
  "assets_value": 50000000,                 // ❌ NOT displayed
  "existing_loans": [...]                   // ❌ NOT displayed
}
```

**Where to display**: New "Financial Information" section
**Importance**: HIGH - Important for creditworthiness assessment
**UI Suggestion**: Create new card section with financial overview

---

### 5. Risk Assessment
```json
{
  "credit_score": 750,                      // ❌ NOT displayed
  "risk_category": "low",                   // ❌ NOT displayed
  "assessment_notes": "Good credit history" // ❌ NOT displayed
}
```

**Where to display**: New "Risk Assessment" section
**Importance**: HIGH - Critical for decision making
**UI Suggestion**: Prominent card with color-coded risk indicator

---

### 6. Workflow Tracking
```json
{
  "workflow_stage": null,                   // ❌ NOT displayed
  "workflow_status": "PO_CREATED",          // ❌ NOT displayed
  "priority_level": "normal",               // ❌ NOT displayed
  "assigned_reviewer": null                 // ❌ NOT displayed
}
```

**Where to display**: New "Workflow Timeline" section
**Importance**: HIGH - Essential for tracking progress
**UI Suggestion**: Timeline component showing stages

---

### 7. Audit Trail / Timestamps
```json
{
  "po_created_at": "2025-10-17T03:45:12Z",  // ❌ NOT displayed
  "po_created_by": "uuid...",               // ❌ NOT displayed
  "user_completed_at": null,                // ❌ NOT displayed
  "user_completed_by": null,                // ❌ NOT displayed
  "teller_processed_at": null,              // ❌ NOT displayed
  "teller_processed_by": null,              // ❌ NOT displayed
  "manager_reviewed_at": null,              // ❌ NOT displayed
  "manager_reviewed_by": null               // ❌ NOT displayed
}
```

**Where to display**: "Activity Log" or "Audit Trail" section
**Importance**: MEDIUM - Useful for tracking who did what
**UI Suggestion**: Timeline or table format

---

### 8. Additional Loan Fields
```json
{
  "interest_rate": 2.5,                     // ❌ NOT displayed
  "loan_amount": 5000000,                   // ❌ NOT displayed (duplicate of requested_amount?)
  "loan_status": "pending",                 // ❌ NOT displayed
  "loan_purpose": "Business",               // ❌ NOT displayed (duplicate of purpose_details?)
  "loan_start_date": null,                  // ❌ NOT displayed
  "loan_end_date": null                     // ❌ NOT displayed
}
```

**Where to display**: Loan Details section
**Importance**: MEDIUM - Some may be duplicates or calculated fields
**UI Suggestion**: Add to existing Loan Details card

---

### 9. Guarantor Extended Information
```json
{
  "guarantor_id_number": "123456789",       // ❌ NOT displayed
  "guarantor_address": "Phnom Penh",        // ❌ NOT displayed
  "guarantor_relationship": "Brother"       // ❌ NOT displayed
}
```

**Where to display**: Guarantor Information section
**Importance**: MEDIUM - Useful for verification
**UI Suggestion**: Add to existing Guarantor card

---

### 10. Account Grouping
```json
{
  "account_id": "00012345"                  // ❌ NOT displayed
}
```

**Where to display**: Top of page or Customer Information
**Importance**: MEDIUM - Useful for PMS integration
**UI Suggestion**: Badge or info card at top

---

## Priority Ranking for Implementation

### 🔴 HIGH Priority (Implement First)
1. **Employment Information** (occupation, employer, income)
2. **Financial Information** (expenses, assets, existing loans)
3. **Risk Assessment** (credit score, risk category)
4. **Workflow Status** (workflow_status, priority_level)
5. **Interest Rate** (critical loan term)

### 🟡 MEDIUM Priority (Implement Second)
6. **Sex & Marital Status** (demographic data)
7. **Guarantor Extended Info** (ID, address, relationship)
8. **Account ID** (PMS integration)
9. **Workflow Timeline** (audit trail)
10. **Assigned Reviewer** (workflow tracking)

### 🟢 LOW Priority (Nice to Have)
11. **Loan Start/End Dates** (may be calculated)
12. **Assessment Notes** (internal notes)
13. **Detailed Audit Trail** (all timestamps and users)

---

## Recommended UI Layout Updates

### Current Structure:
```
1. Customer Information
2. Loan Details
3. Assigned Employees
4. Guarantor Information
5. Documents
```

### Proposed Enhanced Structure:
```
1. Customer Information
   └─ Add: Sex, Marital Status

2. Employment Information (NEW)
   └─ Occupation, Employer, Monthly Income, Income Source

3. Financial Overview (NEW)
   └─ Monthly Income, Monthly Expenses, Net Income
   └─ Assets Value, Existing Loans

4. Loan Details
   └─ Add: Interest Rate, Account ID

5. Risk Assessment (NEW)
   └─ Credit Score, Risk Category, Assessment Notes

6. Workflow Status (NEW)
   └─ Current Status, Priority, Timeline, Assigned Reviewer

7. Assigned Employees
   └─ (Keep as is)

8. Guarantor Information
   └─ Add: ID Number, Address, Relationship

9. Activity Log (NEW)
   └─ Who created, completed, processed, reviewed

10. Documents
    └─ (Keep as is)
```

---

## Implementation Checklist

### Phase 1: Critical Business Data
- [ ] Add Employment Information section
- [ ] Add Financial Information section
- [ ] Add Risk Assessment section
- [ ] Add Interest Rate to Loan Details
- [ ] Add Sex & Marital Status to Customer Info

### Phase 2: Workflow & Tracking
- [ ] Add Workflow Status badge
- [ ] Add Priority indicator
- [ ] Add Workflow Timeline
- [ ] Add Assigned Reviewer card
- [ ] Add Activity Log

### Phase 3: Extended Details
- [ ] Add Guarantor extended fields
- [ ] Add Account ID display
- [ ] Add Loan start/end dates
- [ ] Add Assessment notes
- [ ] Add detailed audit trail

---

## Data Completeness Check

To verify which fields have data, check:
1. Are these fields being populated during application creation?
2. Are they optional or required?
3. Do existing applications have this data?

### Likely Empty Fields (May not have data yet):
- `workflow_stage` - May not be implemented yet
- `assigned_reviewer` - May not be assigned yet
- `credit_score` - May not be calculated yet
- `risk_category` - May not be assessed yet
- `existing_loans` - May not be collected yet
- `loan_start_date` / `loan_end_date` - May be calculated later

### Should Have Data:
- `sex`, `marital_status` - Should be collected in form
- `occupation`, `employer_name`, `monthly_income` - Should be collected
- `interest_rate` - Should be set based on product type
- `workflow_status` - Should always have a value
- `priority_level` - Should default to "normal"

---

## Summary

**Total Fields in Backend**: ~50+ fields
**Currently Displayed**: ~20 fields (40%)
**Missing from UI**: ~30 fields (60%)

**Critical Missing Data**:
- Employment information (4 fields)
- Financial information (3 fields)
- Risk assessment (3 fields)
- Workflow tracking (8+ fields)
- Extended guarantor info (3 fields)

**Recommendation**: Implement in 3 phases, starting with critical business data that affects loan decisions (employment, financial, risk assessment).
