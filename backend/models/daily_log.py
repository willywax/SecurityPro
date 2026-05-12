"""Daily log models for zone manager shift reporting."""
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel


class DailyLog(BaseModel):
    """Daily shift log submitted by a zone manager for a site."""
    __tablename__ = "daily_logs"

    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    log_date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False)  # morning|afternoon|night|full_day
    submission_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    overall_status = Column(String, nullable=False, default="normal", server_default="normal")  # normal|incident|critical
    notes = Column(Text, nullable=True)

    attendance = relationship("DailyLogAttendance", back_populates="log", cascade="all, delete-orphan")
    incidents = relationship("DailyLogIncident", back_populates="log", cascade="all, delete-orphan")


class DailyLogAttendance(BaseModel):
    """Per-guard attendance record within a daily log."""
    __tablename__ = "daily_log_attendance"

    log_id = Column(UUID(as_uuid=True), ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)
    employee_name = Column(String, nullable=False)  # snapshot at log submission time
    guard_no = Column(String, nullable=True)         # snapshot
    status = Column(String, nullable=False, default="present", server_default="present")  # present|absent|late|left_early
    notes = Column(Text, nullable=True)

    log = relationship("DailyLog", back_populates="attendance")


class DailyLogIncident(BaseModel):
    """An incident recorded within a daily log."""
    __tablename__ = "daily_log_incidents"

    log_id = Column(UUID(as_uuid=True), ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_type = Column(String, nullable=False)  # guard_absent|theft|complaint|injury|misconduct|other
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="low", server_default="low")  # low|medium|high
    reported_by = Column(String, nullable=True)

    log = relationship("DailyLog", back_populates="incidents")
