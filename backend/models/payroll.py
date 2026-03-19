"""Payroll model."""
from sqlalchemy import Column, String, Float, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import PayrollStatus


class Payroll(BaseModel):
    """Payroll model for employee salary records."""
    __tablename__ = "payrolls"

    payroll_id = Column(String, nullable=False, index=True)  # PAY0001, PAY0002, etc.
    payroll_month = Column(String, nullable=False, index=True)  # Format: YYYY-MM (e.g., "2026-03")
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    base_salary = Column(Float, nullable=False)
    allowances = Column(Float, default=0.0, nullable=False)
    deductions = Column(Float, default=0.0, nullable=False)
    overtime = Column(Float, default=0.0, nullable=False)
    net_pay = Column(Float, nullable=False)  # Computed: base_salary + allowances + overtime - deductions
    status = Column(
        SQLEnum(PayrollStatus, name="payroll_status", create_type=True),
        default=PayrollStatus.DRAFT,
        nullable=False
    )
    notes = Column(String, nullable=True)

    # Unique constraint: one payroll per employee per month
    __table_args__ = (
        UniqueConstraint('org_id', 'employee_id', 'payroll_month', name='uq_payroll_employee_month'),
    )

    # Relationships
    employee = relationship("Employee", back_populates="payrolls")
