# backend/models/customer.py
from pydantic import BaseModel
from typing import Optional

class PersonalDetails(BaseModel):
    id_number: str
    age: int
    gender: str
    dob_gr: str
    dob_hj: str
    address: str
    marital_status: str
    nationality: str
    father_name: str
    grandfather_name: str
    dependents: str
    income_type: str

class EmploymentDetails(BaseModel):
    type: str
    industry: str
    employer: str
    experience: str
    address: str

class IncomeDetails(BaseModel):
    monthly: str

class CustomerProfile(BaseModel):
    name: str
    phone: str
    email: str
    personal: PersonalDetails
    employment: EmploymentDetails
    income: IncomeDetails
