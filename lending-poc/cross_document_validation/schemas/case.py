"""Request/response schemas for POST /cases.

Mirrors the JSON shape documented in docs/Workflow.md and used by
scripts/sample_case.json — a flat list of documents. applicant_ref is not
part of the request; it is generated server-side in case_parsing.py.

`DocumentIn` is a discriminated union keyed on document_type: each document
kind gets its own fields, matching the field-mapping service's per-document
output shape directly (no extracted_fields/source_file_ref wrapper).
"""

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field


class BankTransactionIn(BaseModel):
    transaction_date: str | None = None
    description: str | None = None
    amount: float | str | None = None
    currency: str | None = None
    direction: str | None = None
    balance: float | str | None = None


class DocumentMetadataPeriodIn(BaseModel):
    from_: str | None = Field(default=None, alias="from")
    to: str | None = None

    model_config = {"populate_by_name": True}


class SalarySlipDocumentMetadataIn(BaseModel):
    document_date: str | None = None
    period: DocumentMetadataPeriodIn | None = None
    currency: str | None = None


class EmployerIn(BaseModel):
    name: str | None = None


class EmployeeIn(BaseModel):
    employee_id: str | None = None
    name: str | None = None
    bank_account_number: str | None = None
    date_of_joining: str | None = None
    days_worked: int | None = None

    model_config = {"extra": "allow"}


class NetSalaryIn(BaseModel):
    amount: float | str | None = None
    currency: str | None = None
    amount_in_words: str | None = None


class EarningsIn(BaseModel):
    basic_per_month: float | str | None = None
    gross_per_month: float | str | None = None
    allowances_per_month: float | str | None = None
    other: float | str | None = None

    model_config = {"extra": "allow"}


class DeductionsIn(BaseModel):
    total: float | str | None = None
    tax: float | str | None = None
    retirement_contribution: float | str | None = None
    other: float | str | None = None

    model_config = {"extra": "allow"}


class BankStatementSummaryIn(BaseModel):
    total_credits: float | str | None = None
    total_debits: float | str | None = None
    opening_balance: float | str | None = None
    closing_balance: float | str | None = None


class AadhaarDocumentIn(BaseModel):
    document_type: Literal["aadhaar"]
    name: str | None = None
    date_of_birth: str | None = None
    aadhaar_number: str | None = None
    address: str | None = None


class PanDocumentIn(BaseModel):
    document_type: Literal["pan"]
    name: str | None = None
    date_of_birth: str | None = None
    pan_number: str | None = None


class AddressProofDocumentIn(BaseModel):
    document_type: Literal["address_proof"]
    address: str | None = None


class SalarySlipDocumentIn(BaseModel):
    document_type: Literal["salary_slip"]
    document_metadata: SalarySlipDocumentMetadataIn | None = None
    employer: EmployerIn | None = None
    employee: EmployeeIn | None = None
    earnings: EarningsIn | None = None
    deductions: DeductionsIn | None = None
    net_salary: NetSalaryIn | None = None


class BankStatementDocumentMetadataIn(BaseModel):
    statement_period: DocumentMetadataPeriodIn | None = None
    currency: str | None = None


class BankAccountIn(BaseModel):
    account_number: str | None = None
    customer_id: str | None = None
    account_holder_name: str | None = None
    account_type: str | None = None
    bank_name: str | None = None
    branch_name: str | None = None
    lien_amount: float | str | None = None


class BankStatementDocumentIn(BaseModel):
    document_type: Literal["bank_statement"]
    document_metadata: BankStatementDocumentMetadataIn | None = None
    account: BankAccountIn | None = None
    transactions: list[BankTransactionIn] = Field(default_factory=list)
    summary: BankStatementSummaryIn | None = None


DocumentIn = Annotated[
    Union[
        AadhaarDocumentIn,
        PanDocumentIn,
        AddressProofDocumentIn,
        SalarySlipDocumentIn,
        BankStatementDocumentIn,
    ],
    Field(discriminator="document_type"),
]


class CaseCreateRequest(BaseModel):
    documents: list[DocumentIn]


class ValidationResultOut(BaseModel):
    check_type: str
    passed: bool
    score: float
    document_id: str | None = None
    evidence: dict[str, Any] | None = None
    # Only set for SALARY_DATE checks that matched a bank credit: the amount
    # of that matched transaction, i.e. the salary amount as validated
    # against the bank statement (see evidence.matched_transaction).
    matched_salary_amount: float | None = None


class CaseCreateResponse(BaseModel):
    case_id: str
    applicant_ref: str
    decision: str
    overall_score: float
    reasons: list[str]
    validation_results: list[ValidationResultOut]
