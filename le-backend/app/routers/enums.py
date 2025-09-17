from fastapi import APIRouter

router = APIRouter()

@router.get("/id-card-types")
async def get_id_card_types():
    """Get available ID card types"""
    return [
        {"value": "cambodian_identity", "label": "អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ"},
        {"value": "passport", "label": "លិខិតឆ្លងដែន"},
        {"value": "driver-license", "label": "ប័ណ្ណបើកបរ"},
        {"value": "gov-card", "label": "ប័ណ្ណមន្ត្រីរាជការ"},
        {"value": "monk-card", "label": "ប័ណ្ណព្រះសង្ឃ"},
        {"value": "family-book", "label": " សៀវភៅគ្រួសារ"},
        {"value": "birth-certificate", "label": " សំបុត្រកំណើត"},
        {"value": "other", "label": " ផ្សេងៗ"}
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
        {"value": "commerce", "label": "អាជីវកម្ម"},
        {"value": "agriculture", "label": "កសិកម្ម"},
        {"value": "education", "label": "ការសិក្សា"},
        {"value": "housing", "label": "លំនៅដ្ឋាន"},
        {"value": "vehicle", "label": "យានយន្ត"},
        {"value": "medical", "label": "វេជ្ជសាស្ត្រ"},
        {"value": "other", "label": "ផ្សេងៗ"}
    ]

@router.get("/product-types")
async def get_product_types():
    """Get available product types"""
    return [
        {"value": "monthly_loan", "label": "បង់​ប្រចាំ ខែ"},
        {"value": "biweekly_loan", "label": "បង់​ប្រចាំ ២សប្តាហ៍"},
        {"value": "weekly_loan", "label": "បង់​ប្រចាំ សប្តាហ៍"},
        {"value": "daily_loan", "label": "បង់​ប្រាក់ បង្វិល"}


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