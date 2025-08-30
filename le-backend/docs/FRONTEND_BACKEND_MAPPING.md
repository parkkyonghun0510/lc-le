# Frontend to Backend Data Mapping

## Customer Application Fields

### Basic Information
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `id` | `id` | UUID | Primary key |
| `name` | `full_name_latin` | String | Customer name in Latin |
| `phone` | `phone` | String | Phone number |
| `nid` | `id_number` | String | National ID number |

### Loan Information
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `loanAmount` | `loan_amount` | Decimal | Current/approved loan amount |
| `interestRate` | `interest_rate` | Decimal | Annual percentage rate |
| `loanStatus` | `loan_status` | String | draft, active, disbursed, completed, defaulted |
| `loanPurpose` | `loan_purpose` | String | Single purpose description |
| `loanStartDate` | `loan_start_date` | Date | Actual disbursement date |
| `loanEndDate` | `loan_end_date` | Date | Loan maturity date |

### Detailed Borrower Information
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `idCardType` | `id_card_type` | String | cambodian_identity, passport, family_book |
| `fullNameKhmer` | `full_name_khmer` | String | Customer name in Khmer |
| `fullNameLatin` | `full_name_latin` | String | Customer name in Latin |
| `dateOfBirth` | `date_of_birth` | Date | Birth date |
| `idNumber` | `id_number` | String | ID card number |
| `portfolioOfficerName` | `portfolio_officer_name` | String | Officer name |

### Loan Details
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `requestedAmount` | `requested_amount` | Decimal | Requested loan amount |
| `loanPurposes` | `loan_purposes` | JSON Array | Array of purpose types |
| `purposeDetails` | `purpose_details` | String | Detailed purpose description |
| `productType` | `product_type` | String | micro_loan, sme_loan, monthly, etc. |
| `desiredLoanTerm` | `desired_loan_term` | String | 6_months, 12_months, etc. |
| `requestedDisbursementDate` | `requested_disbursement_date` | Date | Requested disbursement date |

### Guarantor Information
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `guarantorName` | `guarantor_name` | String | Guarantor full name |
| `guarantorPhone` | `guarantor_phone` | String | Guarantor phone number |

### Photo/Document Paths
| Frontend Field | Backend Field | Type | Notes |
|---|---|---|---|
| `profileImage` | `profile_image` | String | Profile photo URL |
| `borrowerNidPhotoPath` | `borrower_nid_photo_path` | String | Borrower ID photo path |
| `borrowerHomeOrLandPhotoPath` | `borrower_home_or_land_photo_path` | String | Home/land photo path |
| `borrowerBusinessPhotoPath` | `borrower_business_photo_path` | String | Business photo path |
| `guarantorNidPhotoPath` | `guarantor_nid_photo_path` | String | Guarantor ID photo path |
| `guarantorHomeOrLandPhotoPath` | `guarantor_home_or_land_photo_path` | String | Guarantor home photo path |
| `guarantorBusinessPhotoPath` | `guarantor_business_photo_path` | String | Guarantor business photo path |
| `profilePhotoPath` | `profile_photo_path` | String | Profile photo path |

## API Endpoints

### Applications
- `GET /api/v1/applications/` - List applications with filtering
- `GET /api/v1/applications/cards` - Get customer cards optimized for UI display
- `POST /api/v1/applications/` - Create new application
- `GET /api/v1/applications/{id}` - Get application details
- `PUT /api/v1/applications/{id}` - Update application
- `DELETE /api/v1/applications/{id}` - Delete application
- `PATCH /api/v1/applications/{id}/submit` - Submit application
- `PATCH /api/v1/applications/{id}/approve` - Approve application (with optional approval data)
- `PATCH /api/v1/applications/{id}/reject` - Reject application
- `PATCH /api/v1/applications/{id}/loan-status` - Update loan status (auto-calculates end date)

### Enums/Options
- `GET /api/v1/enums/all` - Get all enum options
- `GET /api/v1/applications/enums/options` - Get application-specific options

## Enum Mappings

### ID Card Types
```typescript
enum IdCardType {
  cambodianIdentity = 'cambodian_identity',
  passport = 'passport',
  familyBook = 'family_book'
}
```

### Loan Status
```typescript
enum LoanStatus {
  draft = 'draft',
  active = 'active',
  disbursed = 'disbursed',
  completed = 'completed',
  defaulted = 'defaulted'
}
```

### Loan Purpose Types
```typescript
enum LoanPurposeType {
  commerce = 'commerce',
  agriculture = 'agriculture',
  education = 'education',
  housing = 'housing',
  vehicle = 'vehicle',
  medical = 'medical',
  other = 'other'
}
```

### Product Types
```typescript
enum ProductType {
  microLoan = 'micro_loan',
  smeLoan = 'sme_loan',
  agricultureLoan = 'agriculture_loan',
  housingLoan = 'housing_loan',
  educationLoan = 'education_loan',
  monthly = 'monthly',
  weekly = 'weekly'
}
```

## Date Handling

Frontend DateTime objects should be converted to ISO strings when sending to backend:
```typescript
// Frontend
loanStartDate: DateTime.now()

// Send to backend
{
  loan_start_date: loanStartDate.toISOString()
}
```

Backend will automatically parse ISO date strings to Date objects.

## CustomerCard API Response

The `/api/v1/applications/cards` endpoint returns optimized data for your CustomerCard UI:

```typescript
interface CustomerCardResponse {
  // Primary identification
  id: string;
  display_name: string;  // Computed from full_name_latin or full_name_khmer
  id_number?: string;    // National ID for rapid identification
  phone?: string;
  
  // Loan status and lifecycle
  loan_status?: 'draft' | 'active' | 'disbursed' | 'completed' | 'defaulted';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  loan_amount?: number;     // Approved/current loan amount
  requested_amount?: number; // Original requested amount
  interest_rate?: number;
  loan_start_date?: string; // Actual disbursement date
  loan_end_date?: string;   // Loan maturity date (auto-calculated)
  
  // Loan details as chips
  loan_purposes?: string[];
  product_type?: string;
  desired_loan_term?: string;
  
  // Secondary details
  portfolio_officer_name?: string;
  risk_category?: string;
  priority_level?: string;
  
  // Visual elements
  profile_image?: string;
  profile_photo_path?: string;
  status_color: string;  // Computed: 'red', 'green', 'blue', 'yellow', 'gray'
  
  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  
  // System feedback
  sync_status: 'synced' | 'syncing' | 'error';
  
  // Guarantor
  guarantor_name?: string;
}
```

## Enhanced Approval Process

When approving applications, you can now specify approved amounts:

```typescript
// Approve with custom amounts
PATCH /api/v1/applications/{id}/approve
{
  "approved_amount": 2000.0,      // Different from requested
  "approved_interest_rate": 1.2,  // Adjusted rate
  "approved_loan_term": "18_months" // Different term
}

// Simple approval (uses requested amounts)
PATCH /api/v1/applications/{id}/approve
```

## Automatic Date Calculations

- When loan status is set to "disbursed", `loan_start_date` is automatically set to current date
- `loan_end_date` is automatically calculated based on `desired_loan_term`:
  - "12_months" → 12 months from start date
  - "6_months" → 6 months from start date
  - etc.

## Sample API Request

```typescript
const customerData = {
  // Basic info
  full_name_latin: 'Chan Sokha',
  full_name_khmer: 'ចាន សុខា',
  phone: '+855 12 345 678',
  id_number: '123456789012',
  
  // Loan details
  requested_amount: 2500.0,
  interest_rate: 1.5,
  loan_purpose: 'Small Business',
  
  // Additional details
  id_card_type: 'cambodian_identity',
  date_of_birth: '1985-03-15',
  portfolio_officer_name: 'Chen Sopheakdey',
  loan_purposes: ['commerce'],
  purpose_details: 'Expand grocery store inventory',
  product_type: 'monthly',
  desired_loan_term: '12_months',
  
  // Guarantor
  guarantor_name: 'Kim Dara',
  guarantor_phone: '+855 98 765 432',
  
  // Photos
  profile_image: 'https://i.pravatar.cc/150?img=1',
  borrower_nid_photo_path: 'assets/demo/sokha_nid.jpg',
  // ... other photo paths
};
```