"""Employee and related models."""
from sqlalchemy import Column, String, Date, ForeignKey, Enum as SQLEnum, Boolean, Integer, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import (
    Gender,
    MaritalStatus,
    EmploymentStatus,
    IDType,
    ContractType,
    ContractStatus,
)


class Employee(BaseModel):
    """Employee model for HR management."""
    __tablename__ = "employees"

    # Auto-generated IDs
    employee_id = Column(String, nullable=False, index=True)  # EMP0001, EMP0002, etc.
    guard_no = Column(String, nullable=True, index=True)  # G0001, G0002, etc.

    # Personal Information
    profile_photo = Column(String, nullable=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    gender = Column(SQLEnum(Gender, name="gender", create_type=True), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    marital_status = Column(SQLEnum(MaritalStatus, name="marital_status", create_type=True), nullable=True)
    nationality = Column(String, nullable=True)
    nin = Column(String, nullable=True)  # National Identification Number

    # Contact Information
    phone_1 = Column(String, nullable=True)
    phone_2 = Column(String, nullable=True)
    email = Column(String, nullable=True)
    physical_address = Column(String, nullable=True)
    postal_address = Column(String, nullable=True)

    # Employment Information
    education_background = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    employment_status = Column(
        SQLEnum(EmploymentStatus, name="employment_status", create_type=True),
        default=EmploymentStatus.ACTIVE,
        nullable=False
    )
    hire_date = Column(Date, nullable=True)
    termination_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="employee", foreign_keys="User.employee_id")
    bank_accounts = relationship("EmployeeBankAccount", back_populates="employee", cascade="all, delete-orphan")
    referees = relationship("EmployeeReferee", back_populates="employee", cascade="all, delete-orphan")
    next_of_kin = relationship("EmployeeNextOfKin", back_populates="employee", cascade="all, delete-orphan")
    contracts = relationship("EmployeeContract", back_populates="employee", cascade="all, delete-orphan")
    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    employment_history = relationship("EmploymentHistory", back_populates="employee", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="employee", cascade="all, delete-orphan")


class EmployeeBankAccount(BaseModel):
    """Employee banking information."""
    __tablename__ = "employee_bank_accounts"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name = Column(String, nullable=False)
    bank_branch = Column(String, nullable=True)
    account_name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="bank_accounts")


class EmployeeReferee(BaseModel):
    """Employee reference contacts."""
    __tablename__ = "employee_referees"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    referee_relationship = Column(String, nullable=False)  # Renamed from 'relationship' to avoid conflict
    phone_number = Column(String, nullable=False)
    alternate_phone = Column(String, nullable=True)
    id_type = Column(SQLEnum(IDType, name="id_type", create_type=True), nullable=True)
    id_number = Column(String, nullable=True)
    id_softcopy_file = Column(String, nullable=True)
    address = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="referees")


class EmployeeNextOfKin(BaseModel):
    """Employee emergency contacts."""
    __tablename__ = "employee_next_of_kin"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    kin_relationship = Column(String, nullable=False)  # Renamed from 'relationship' to avoid conflict
    phone_1 = Column(String, nullable=False)
    phone_2 = Column(String, nullable=True)
    address = Column(String, nullable=True)
    id_type = Column(SQLEnum(IDType, name="id_type_nok", create_type=True), nullable=True)
    id_number = Column(String, nullable=True)
    id_softcopy_file = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="next_of_kin")


class EmployeeContract(BaseModel):
    """Employee employment contracts."""
    __tablename__ = "employee_contracts"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    contract_number = Column(String, nullable=False, index=True)  # CON0001, CON0002, etc.
    contract_type = Column(SQLEnum(ContractType, name="contract_type", create_type=True), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    duration_months = Column(Integer, nullable=True)
    probation_months = Column(Integer, nullable=True)
    salary_amount = Column(Float, nullable=True)
    job_title_on_contract = Column(String, nullable=True)
    workstation_site = Column(String, nullable=True)
    signed_date = Column(Date, nullable=True)
    employee_signed = Column(Boolean, default=False, nullable=False)
    employer_signed = Column(Boolean, default=False, nullable=False)
    contract_document_file = Column(String, nullable=True)
    status = Column(
        SQLEnum(ContractStatus, name="contract_status", create_type=True),
        default=ContractStatus.DRAFT,
        nullable=False
    )

    # Relationships
    employee = relationship("Employee", back_populates="contracts")


class EmployeeDocument(BaseModel):
    """Employee document attachments."""
    __tablename__ = "employee_documents"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String, nullable=False)  # e.g., "id_card", "certificate", "license"
    name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="documents")


class EmploymentHistory(BaseModel):
    """Employee previous employment history."""
    __tablename__ = "employment_history"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    employer_name = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    reason_for_leaving = Column(String, nullable=True)
    reference_contact = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="employment_history")
