# backend/db.py
# Simple in-memory DB for demo. Replace with real DB in production.
from models.customer import CustomerProfile, PersonalDetails, EmploymentDetails, IncomeDetails

CUSTOMER_DB = {
    "8123456789": CustomerProfile(
        name="Samriddhi Jha",
        phone="8123456789",
        email="samriddhi.jha@gmail.com",
        personal=PersonalDetails(
            id_number="1234567890",
            age=23,
            gender="Female",
            dob_gr="18/11/2002",
            dob_hj="1161414",
            address="221B Baker Street, Al Olaya District, Riyadh",
            marital_status="Single",
            nationality="Indian",
            father_name="Ramnesh Raman Jha",
            grandfather_name="Satyanarayan Jha",
            dependents="04",
            income_type="Salaried"
        ),
        employment=EmploymentDetails(
            type="Salaried",
            industry="IT",
            employer="Newgen Software",
            experience="2",
            address="221B Baker Street, Al Olaya District, Riyadh"
        ),
        income=IncomeDetails(
            monthly="SAR 50,000"
        )
    )
}

def get_customer_by_phone(phone: str):
    return CUSTOMER_DB.get(phone)
