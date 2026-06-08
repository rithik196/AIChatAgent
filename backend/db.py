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
            monthly="SAR 25,000"
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
            monthly="SAR 20,000"
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
