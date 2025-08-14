from fastapi import APIRouter

router = APIRouter()

@router.get("/id-card-types")
async def get_id_card_types():
    """Get available ID card types"""
    return [
        {"value": "cambodian_identity", "label": "Cambodian Identity Card"},
        {"value": "passport", "label": "Passport"},
        {"value": "family_book", "label": "Family Book"}
    ]

@router.get("/loan-statuses")
async def get_loan_statuses():
    """Get available loan statuses"""
    return [
        {"value": "draft", "label": "Draft"},
        {"value": "active", "label": "Active"},
        {"value": "disbursed", "label": "Disbursed"},
        {"value": "completed", "label": "Completed"},
        {"value": "defaulted", "label": "Defaulted"}
    ]

@router.get("/loan-purposes")
async def get_loan_purposes():
    """Get available loan purposes"""
    return [
        {"value": "commerce", "label": "Commerce/Business"},
        {"value": "agriculture", "label": "Agriculture"},
        {"value": "education", "label": "Education"},
        {"value": "housing", "label": "Housing"},
        {"value": "vehicle", "label": "Vehicle"},
        {"value": "medical", "label": "Medical"},
        {"value": "other", "label": "Other"}
    ]

@router.get("/product-types")
async def get_product_types():
    """Get available product types"""
    return [
        {"value": "micro_loan", "label": "Micro Loan"},
        {"value": "sme_loan", "label": "SME Loan"},
        {"value": "agriculture_loan", "label": "Agriculture Loan"},
        {"value": "housing_loan", "label": "Housing Loan"},
        {"value": "education_loan", "label": "Education Loan"},
        {"value": "monthly", "label": "បង់​ប្រចាំ ខែ"},
        {"value": "weekly", "label": "បង់​ប្រចាំ សប្តាហ៍"}
    ]

@router.get("/all")
async def get_all_enums():
    """Get all enum options for frontend"""
    return {
        "idCardTypes": await get_id_card_types(),
        "loanStatuses": await get_loan_statuses(),
        "loanPurposes": await get_loan_purposes(),
        "productTypes": await get_product_types(),
        "riskCategories": [
            {"value": "low", "label": "Low Risk"},
            {"value": "medium", "label": "Medium Risk"},
            {"value": "high", "label": "High Risk"}
        ],
        "priorityLevels": [
            {"value": "low", "label": "Low Priority"},
            {"value": "normal", "label": "Normal Priority"},
            {"value": "high", "label": "High Priority"},
            {"value": "urgent", "label": "Urgent"}
        ],
        "applicationStatuses": [
            {"value": "draft", "label": "Draft"},
            {"value": "submitted", "label": "Submitted"},
            {"value": "approved", "label": "Approved"},
            {"value": "rejected", "label": "Rejected"}
        ]
    }