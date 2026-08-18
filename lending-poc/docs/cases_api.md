# `/cases` API

## What this PR does

Adds the `POST /cases` endpoint, the first user-facing entry point into the lending validation pipeline. It accepts an applicant's KYC and income documents (Aadhaar, PAN, address proof, salary slips, bank statement) as JSON, runs them through identity and business validation, computes an overall confidence score, and returns a PASS / FAIL / NEEDS_REVIEW decision. The full case, its documents, golden record, and validation results are persisted to the database in one transaction.

## Endpoint

`POST /cases`

### Request

```json
{
  "documents": [
    {
      "document_type": "aadhaar",
      "name": "Sneha Sunil Lokhande",
      "address": "Flat 204, Green Heights, Baner, Pune, Maharashtra 411045",
      "aadhaar_number": "XXXX XXXX 4321",
      "date_of_birth": "14/03/1995"
    },
    {
      "document_type": "pan",
      "name": "Sneha Lokhande",
      "pan_number": "ABCDE1234F"
    },
    {
      "document_type": "address_proof",
      "address": "Apartment 204, Green Heights, Baner, Pune, MH 411045"
    },
    {
      "document_type": "salary_slip",
      "document_metadata": {
        "document_date": "31-03-2026",
        "period": { "from": "01-03-2026", "to": "31-03-2026" },
        "currency": "INR"
      },
      "employer": { "name": "ABC Technologies Pvt Ltd" },
      "employee": { "name": "Sneha Sunil Lokhande" },
      "net_salary": { "amount": "75,000.00", "currency": "INR" }
    },
    {
      "document_type": "bank_statement",
      "document_metadata": {
        "statement_period": { "from": "01-04-2026", "to": "31-07-2026" },
        "currency": "INR"
      },
      "account": { "account_holder_name": "Lokhande S. S." },
      "transactions": [
        { "transaction_date": "01.04.2026", "description": "ABC TECHNOLOGIES SALARY MAR", "amount": 75000, "direction": "Credited" },
        { "transaction_date": "03.04.2026", "description": "HOUSE RENT EMI DEBIT", "amount": 18000, "direction": "Debited" }
      ]
    }
  ]
}
```

Notes:
- `documents` is required. `applicant_ref` is not part of the request — it is generated server-side and returned in the response.
- Every document needs a `document_type` (lowercase: `aadhaar`, `pan`, `address_proof`, `salary_slip`, `bank_statement`); its other fields sit directly on the document object rather than under a nested wrapper.
- `salary_slip` and `bank_statement` can each appear multiple times in `documents` (e.g. one `salary_slip` entry per month); their data is combined for validation — salary slips accumulate per month, bank statement transactions are merged across all `bank_statement` entries.
- Dates (`date_of_birth`, `document_date`, `period.from`/`to`, `transaction_date`, etc.) accept `DD/MM/YYYY`, `DD.MM.YYYY`, or `DD-MM-YYYY`. Money fields (e.g. `net_salary.amount`) accept plain numbers or comma-formatted strings like `"75,000.00"`.
- Bank statement transactions carry an unsigned `amount` plus a `direction` of `"Credited"` or `"Debited"`; debits are treated as negative internally.
- Required document types for a case to proceed: `aadhaar`, `pan`, `salary_slip`, `bank_statement`. `address_proof` is optional (used as an address fallback).

### Response `200 OK`

```json
{
  "case_id": "6e2f6c2a-6a3a-4c1d-9a4b-6f2b6c2a6a3a",
  "applicant_ref": "APP-2026-00134",
  "decision": "NEEDS_REVIEW",
  "overall_score": 88.4,
  "reasons": [
    "SALARY_DATE:no_matching_credit_in_window",
    "EMPLOYER:employer_narration_mismatch"
  ],
  "validation_results": [
    {
      "check_type": "NAME",
      "passed": true,
      "score": 94.5,
      "document_id": "PAN",
      "evidence": {
        "source_text": "Sneha Sunil Lokhande",
        "target_text": "Sneha Lokhande",
        "match_type": "FUZZY"
      }
    },
    {
      "check_type": "SALARY_DATE",
      "passed": true,
      "score": 83.5,
      "document_id": "SALARY_SLIP-2",
      "evidence": {
        "source_text": "May 2026",
        "target_text": "2026-06",
        "match_type": "DATE_MATCH",
        "matched_transaction": {
          "narration": "NIMBUS RETAIL SALARY MAY",
          "amount": 78000.0,
          "txn_date": "2026-06-02"
        }
      },
      "matched_salary_amount": 78000.0
    },
    {
      "check_type": "SALARY_DATE",
      "passed": false,
      "score": 0.0,
      "document_id": "SALARY_SLIP-3",
      "evidence": {
        "source_text": "June 2026",
        "target_text": null,
        "match_type": "DATE_MATCH",
        "window": ["2026-05-27", "2026-07-31"]
      },
      "matched_salary_amount": null
    },
    {
      "check_type": "SALARY_CREDIT_COUNT",
      "passed": false,
      "score": 75.0,
      "document_id": "BANK_STATEMENT",
      "evidence": {
        "source_value": 4,
        "target_value": 3,
        "match_type": "COUNT_MATCH",
        "stmt_duration": { "start": "2026-04-01", "end": "2026-07-04" },
        "total_slips": 4,
        "confidence_score": 75.0
      }
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `case_id` | string (UUID) | Primary key of the persisted `Case` row. |
| `applicant_ref` | string | Generated server-side for this case. |
| `decision` | string | One of `PASS`, `FAIL`, `NEEDS_REVIEW`. |
| `overall_score` | float | Weighted score (0–100) across all validation checks. |
| `reasons` | string[] | Why this decision was reached (e.g. failing checks, or which mandatory field is missing). |
| `validation_results` | array | One entry per check run, with `check_type`, `passed`, `score`, the `document_id` it applies to, and any supporting `evidence`. |
| `validation_results[].matched_salary_amount` | float or null | Only set on `SALARY_DATE` checks that matched a bank credit: the amount of that credit, i.e. the salary amount as validated against the bank statement. `null` for every other check type, and for `SALARY_DATE` checks with no match. |

### Error responses

| Status | When |
|---|---|
| `400 Bad Request` | The request body fails semantic parsing in `parse_case` (e.g. an unparseable date or amount). |
| `422 Unprocessable Entity` | The request body fails schema validation (wrong types, missing `documents`, or an unrecognized `document_type`). |

If any of `AADHAAR`, `PAN`, `SALARY_SLIP`, `BANK_STATEMENT` is missing from `documents`, the pipeline still returns `200 OK` with `decision: "FAIL"` and reasons like `MISSING_DOCUMENT:PAN` — this is a business decision, not an HTTP error.
