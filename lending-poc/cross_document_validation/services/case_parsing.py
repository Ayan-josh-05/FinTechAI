"""Parses the raw request JSON shape (see docs/Workflow.md) into CaseInput.

Used by the POST /cases endpoint. applicant_ref is not part of the request
body — it is generated here since nothing upstream collects a real
applicant identifier yet.
"""

import random
from datetime import date, datetime

from cross_document_validation.services.dto import (
    AadhaarDoc,
    AddressProofDoc,
    BankStatementDoc,
    BankTransaction,
    CaseInput,
    PanDoc,
    SalarySlipDoc,
)


def _generate_applicant_ref() -> str:
    return f"APP-{datetime.now().year}-{random.randint(0, 99999):05d}"


def _get(fields: dict, key: str) -> str | None:
    """Null-safe field lookup: a missing key, JSON null, and an empty/
    whitespace-only string are all treated as no value."""
    value = fields.get(key)
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _parse_date(value: str | None) -> date | None:
    """Parses a date in DD/MM/YYYY, DD.MM.YYYY, or DD-MM-YYYY form."""
    if value is None:
        return None
    for sep in ("/", ".", "-"):
        try:
            return datetime.strptime(value, f"%d{sep}%m{sep}%Y").date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {value!r}")


def _parse_float(value) -> float | None:
    """Parses a number that may be a formatted string like '41,200.00'."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.replace(",", "").strip()
        if not value:
            return None
    return float(value)


def parse_case(payload: dict) -> CaseInput:
    case = CaseInput(applicant_ref=_generate_applicant_ref())
    salary_slip_index = 0

    for doc in payload["documents"]:
        doc_type = doc["document_type"]

        if doc_type == "aadhaar":
            case.aadhaar = AadhaarDoc(
                name=_get(doc, "name"),
                address=_get(doc, "address"),
                aadhaar_number=_get(doc, "aadhaar_number"),
                date_of_birth=_parse_date(_get(doc, "date_of_birth")),
                source_file_ref=doc.get("source_file_ref"),
            )

        elif doc_type == "pan":
            case.pan = PanDoc(
                name=_get(doc, "name"),
                pan_number=_get(doc, "pan_number"),
                source_file_ref=doc.get("source_file_ref"),
            )

        elif doc_type == "address_proof":
            case.address_proof = AddressProofDoc(
                address=_get(doc, "address"),
                source_file_ref=doc.get("source_file_ref"),
            )

        elif doc_type == "salary_slip":
            employer = doc.get("employer") or {}
            employee = doc.get("employee") or {}
            net_salary = doc.get("net_salary") or {}
            metadata = doc.get("document_metadata") or {}
            period = metadata.get("period") or {}
            salary_month_source = _get(period, "from_") or _get(period, "from") or _get(metadata, "document_date")
            salary_month = _parse_date(salary_month_source)
            case.salary_slips.append(
                SalarySlipDoc(
                    employer_name=_get(employer, "name"),
                    net_salary=_parse_float(_get(net_salary, "amount")),
                    salary_month=salary_month.replace(day=1) if salary_month else None,
                    source_file_ref=doc.get("source_file_ref"),
                    doc_id=f"SALARY_SLIP-{salary_slip_index}",
                    name=_get(employee, "name"),
                )
            )
            salary_slip_index += 1

        elif doc_type == "bank_statement":
            account = doc.get("account") or {}
            transactions = []
            for txn in doc.get("transactions", []):
                amount = _parse_float(_get(txn, "amount"))
                if amount is not None:
                    direction = (_get(txn, "direction") or "").strip().lower()
                    if direction in ("debited", "debit", "dr"):
                        amount = -amount
                    elif direction not in ("credited", "credit", "cr"):
                        raise ValueError(f"Unrecognized transaction direction: {direction!r}")
                transactions.append(
                    BankTransaction(
                        narration=_get(txn, "description"),
                        amount=amount,
                        txn_date=_parse_date(_get(txn, "transaction_date")),
                    )
                )
            if case.bank_statement is None:
                case.bank_statement = BankStatementDoc(
                    transactions=transactions,
                    source_file_ref=doc.get("source_file_ref"),
                    name=_get(account, "account_holder_name"),
                )
            else:
                case.bank_statement.transactions.extend(transactions)

    return case
