# backend/db.py
# Simple in-memory DB for demo. Replace with real DB in production.
from models.customer import CustomerProfile, PersonalDetails, EmploymentDetails, IncomeDetails

try:
    from shared.db.mssql import get_customer_profile_by_phone
    from shared.db.mssql import get_customer_by_national_id as _get_customer_by_national_id_row
except Exception:
    get_customer_profile_by_phone = None
    _get_customer_by_national_id_row = None

CUSTOMER_DB = {
    "5114881234": CustomerProfile(
        name="Abdul Rahman",
        phone="5114881234",
        email="rishabh-mittal@newgensoft.com",
        personal=PersonalDetails(
            id_number="1046403930",
            age=35,
            gender="Male",
            dob_gr="15/05/1988",
            dob_hj="1408",
            address="Villa 12, Al Malaz Residential Compound, Near Prince Faisal Bin Fahd Stadium, Al Jamiah Street",
            marital_status="Married",
            nationality="Saudi",
            father_name="Mohammed",
            grandfather_name="Ali",
            dependents="3",
            income_type="Salaried"
        ),
        employment=EmploymentDetails(
            type="Salaried",
            industry="Software",
            employer="Newgen Software",
            experience="5",
            address="Kingdom Tower, Office 1205, Riyadh, 12214"
        ),
        income=IncomeDetails(
            monthly="SAR 25,000",
            obligations="8750"
        )
    ),
    "5114886789": CustomerProfile(
        name="Faisal Rahman",
        phone="5114886789",
        email="rishabh-mittal@newgensoft.com",
        personal=PersonalDetails(
            id_number="1046403940",
            age=30,
            gender="Male",
            dob_gr="10/10/1993",
            dob_hj="1413",
            address="Villa 13, Al Malaz Residential Compound, Near Prince Faisal Bin Fahd Stadium, Al Jamiah Street",
            marital_status="Single",
            nationality="Saudi",
            father_name="Ahmed",
            grandfather_name="Omar",
            dependents="0",
            income_type="Salaried"
        ),
        employment=EmploymentDetails(
            type="Salaried",
            industry="Software",
            employer="Newgen Software",
            experience="3",
            address="Kingdom Tower, Office 1205, Riyadh, 12214"
        ),
        income=IncomeDetails(
            monthly="SAR 20,000",
            obligations="8750"
        )
    )
}


def _row_to_profile(row: dict):
    return CustomerProfile(
        name=row.get("name") or "",
        phone=row.get("phone") or "",
        email=row.get("email") or "",
        personal=PersonalDetails(
            id_number=row.get("national_id") or "",
            age=row.get("age") or 0,
            gender=row.get("gender") or "",
            dob_gr=row.get("dob_gr") or "",
            dob_hj=row.get("dob_hj") or "",
            address=row.get("personal_address") or "",
            marital_status=row.get("marital_status") or "",
            nationality=row.get("nationality") or "",
            father_name=row.get("father_name") or "",
            grandfather_name=row.get("grandfather_name") or "",
            dependents=row.get("dependents") or "",
            income_type=row.get("income_type") or "",
        ),
        employment=EmploymentDetails(
            type=row.get("employment_type") or "",
            industry=row.get("industry") or "",
            employer=row.get("employer") or "",
            experience=row.get("experience") or "",
            address=row.get("employment_address") or "",
        ),
        income=IncomeDetails(
            monthly=row.get("monthly") or "",
            obligations=str(row.get("obligations") or "8750"),
        ),
    )

def get_customer_by_phone(phone: str):
    if get_customer_profile_by_phone:
        try:
            row = get_customer_profile_by_phone(phone)
            if row:
                return _row_to_profile(row)
        except Exception:
            pass

    return CUSTOMER_DB.get(phone)


def get_customer_by_national_id(national_id: str):
    # Fast local lookup first for demo/test seeded users.
    for customer in CUSTOMER_DB.values():
        if customer.personal.id_number == national_id:
            return customer

    if _get_customer_by_national_id_row:
        try:
            row = _get_customer_by_national_id_row(national_id)
            if row:
                phone = row.get("phone") or ""
                if phone:
                    customer = get_customer_by_phone(phone)
                    if customer:
                        return customer
        except Exception:
            pass

    return None

def update_customer(national_id: str, updated_data: dict):
    """
    Updates the customer details in the primary database.
    This simulates a real database UPDATE transaction.
    """
    customer = get_customer_by_national_id(national_id)
    if not customer:
        return False
        
    # Update personal details
    if "personal" in updated_data:
        p_data = updated_data["personal"]
        customer.personal.marital_status = p_data.get("maritalStatus", customer.personal.marital_status)
        customer.personal.dependents = str(p_data.get("dependents", customer.personal.dependents))
        customer.personal.address = p_data.get("address", customer.personal.address)
        
        # Education wasn't in PersonalDetails originally but user might update it, 
        # normally we would map it. If it exists in model we'd update.

    # Update employment details
    if "employment" in updated_data:
        e_data = updated_data["employment"]
        customer.employment.type = e_data.get("type", customer.employment.type)
        customer.employment.industry = e_data.get("industry", customer.employment.industry)
        customer.employment.employer = e_data.get("employer", customer.employment.employer)
        customer.employment.experience = str(e_data.get("experience", customer.employment.experience))
        customer.employment.address = e_data.get("address", customer.employment.address)

    # Update income details
    if "income" in updated_data:
        i_data = updated_data["income"]
        customer.income.monthly = str(i_data.get("monthly", customer.income.monthly))
        customer.income.obligations = str(i_data.get("obligations", customer.income.obligations or "8750"))
        
    # In a real setup, we would execute an SQL UPDATE here:
    # e.g., execute_sql("UPDATE Customers SET ... WHERE NationalID = ?", (..., national_id))
    
    return True


# ═══════════════════════════════════════════════════════════════════
# ETB SPECIFIC FUNCTIONS (A2c: Formula-calculated + A3: IBAN Master)
# ═══════════════════════════════════════════════════════════════════

def get_etb_customer_profile(customer_id: str) -> dict:
    """
    Fetch ETB customer profile from Customer Master DB.
    Returns income, obligations, credit card limit, and tenure preferences.
    Mock data for demo; upgrade to real DB later.
    
    Args:
        customer_id: National ID of ETB customer (e.g., "1046403930")
    
    Returns:
        {
            "monthly_income": 35650,
            "monthly_obligations": 8750,
            "credit_card_limit": 20000,
            "preferred_tenure_months": 60,
        }
    """
    ETB_CUSTOMER_MASTER = {
        "1046403930": {  # Test ETB ID
            "monthly_income": 35650,
            "monthly_obligations": 8750,
            "credit_card_limit": 20000,
            "preferred_tenure_months": 60,
        },
    }
    
    return ETB_CUSTOMER_MASTER.get(customer_id, {
        "monthly_income": 30000,
        "monthly_obligations": 5000,
        "credit_card_limit": 15000,
        "preferred_tenure_months": 60,
    })


def get_etb_registered_ibans(customer_id: str) -> list:
    """
    Fetch pre-registered IBANs for ETB customer from IBAN Master table (Excel).
    Each ETB customer has pre-associated accounts on file.
    
    Args:
        customer_id: National ID of ETB customer (e.g., "1046403930")
    
    Returns:
        [
            {
                "iban": "SA0230400197093922590013",
                "bank": "Alawwal Bank",
                "beneficiary": "Abdul Rahman",
                "type": "Current Account",
                "is_default": True,
            },
            ...
        ]
    """
    IBAN_MASTER_EXTENDED = {
        "1046403930": [  # Test ETB ID
            {
                "iban": "SA0230400197093922590013",
                "bank": "Alawwal Bank",
                "beneficiary": "Abdul Rahman",
                "type": "Current Account",
                "is_default": True,
            },
            {
                "iban": "SA0210000011100003474306",
                "bank": "National Commercial Bank",
                "beneficiary": "Faisal Rahman",
                "type": "Savings Account",
                "is_default": False,
            },
        ],
    }
    
    return IBAN_MASTER_EXTENDED.get(customer_id, [])

