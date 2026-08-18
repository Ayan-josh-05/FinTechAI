"""Final PASS / FAIL / NEEDS_REVIEW logic."""

from cross_document_validation.services import validation_config as cfg
from cross_document_validation.services.dto import CheckType, Decision, DecisionResult, ScoreResult, ValidationResult

MANDATORY_CHECK_TYPES = {CheckType.NAME, CheckType.AADHAAR, CheckType.PAN, CheckType.DOB}

_CHECK_LABELS = {
    CheckType.NAME: "Name",
    CheckType.ADDRESS: "Address",
    CheckType.AADHAAR: "Aadhaar number",
    CheckType.PAN: "PAN number",
    CheckType.DOB: "Date of birth",
    CheckType.EMPLOYER: "Employer",
    CheckType.SALARY_DATE: "Salary",
    CheckType.SALARY_CREDIT_COUNT: "Salary credits",
}

# Messages that don't need any evidence values filled in.
_STATIC_MESSAGES = {
    "missing_in_golden_record": "{label} could not be determined from any submitted document.",
    "missing_value": "{label} is missing on one of the documents being compared, so it could not be verified.",
    "missing_salary_month": "The salary slip does not state which month it is for.",
    "missing_net_salary": "The salary slip does not state a net salary amount.",
    "missing_employer_name": "The salary slip does not state an employer name.",
    "no_matching_credit_to_verify_employer_against": (
        "The employer name could not be verified because no matching salary credit was found."
    ),
    "digits_differ": "{label} does not match across documents.",
    "suffix_digits_differ": "{label} does not match across documents.",
    "overlapping_digits_differ": "{label} does not match across documents.",
    "masked_length_mismatch": "{label} could not be compared because the masked values are different lengths.",
    "no_unmasked_digits": "{label} could not be verified because no digits are visible on the masked document.",
    "insufficient_unmasked_digits": "{label} could not be reliably verified from the digits visible on the masked document.",
    "unmasked_value_too_short": "{label} could not be compared because the unmasked value is too short.",
    "pan_differs": "PAN number does not match across documents.",
    "dob_differs": "Date of birth does not match across documents.",
}


def _month_from_evidence(result: ValidationResult) -> str | None:
    if result.evidence:
        return result.evidence.get("source_text")
    return None


def _describe_failure(result: ValidationResult) -> str:
    label = _CHECK_LABELS.get(result.check_type, result.check_type.value)
    reason = result.failure_reason

    if reason == "no_matching_credit_in_window" or reason == "no_matching_credit_in_month":
        month = _month_from_evidence(result)
        if month:
            return f"Salary for {month} was not found in the bank statement."
        return "Salary was not found in the bank statement for the expected period."

    if reason == "name_below_threshold" and result.evidence:
        return (
            f"Name \"{result.evidence.get('target_text')}\" does not sufficiently match "
            f"the reference name \"{result.evidence.get('source_text')}\"."
        )

    if reason == "address_below_threshold" and result.evidence:
        return "Address does not sufficiently match the reference address on file."

    if reason == "employer_narration_mismatch" and result.evidence:
        return (
            f"Employer \"{result.evidence.get('source_text')}\" does not match the bank "
            f"transaction narration \"{result.evidence.get('target_text')}\"."
        )

    if reason in _STATIC_MESSAGES:
        return _STATIC_MESSAGES[reason].format(label=label)

    if reason:
        return f"{label} check failed ({reason})."
    return f"{label} did not meet the required threshold."


def make_decision(
    score: ScoreResult, validation_results: list[ValidationResult]
) -> DecisionResult:
    reasons: list[str] = []

    mandatory_failures = [
        r
        for r in validation_results
        if r.check_type in MANDATORY_CHECK_TYPES
        and not r.passed
        and r.failure_reason == "missing_in_golden_record"
    ]
    if mandatory_failures:
        reasons = [_describe_failure(r) for r in mandatory_failures]
        return DecisionResult(
            decision=Decision.FAIL, reasons=reasons, overall_score=score.overall_score
        )

    if score.overall_score >= cfg.DECISION_PASS_THRESHOLD:
        return DecisionResult(decision=Decision.PASS, reasons=["All checks meet the required confidence threshold."], overall_score=score.overall_score)

    if score.overall_score < cfg.DECISION_FAIL_THRESHOLD:
        return DecisionResult(
            decision=Decision.FAIL,
            reasons=["Overall confidence score is too low to proceed."],
            overall_score=score.overall_score,
        )

    failing_checks = [_describe_failure(r) for r in validation_results if not r.passed]
    return DecisionResult(
        decision=Decision.NEEDS_REVIEW,
        reasons=failing_checks or ["Overall confidence score falls in the manual review range."],
        overall_score=score.overall_score,
    )
