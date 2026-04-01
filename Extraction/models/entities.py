from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ══════════════════════════════════════════════════════════════════════════
# Entity Models with Dynamic Descriptions for LLM
# ══════════════════════════════════════════════════════════════════════════

class User(BaseModel):
    model_config = ConfigDict(extra='allow')  # captures ANY LLM-returned key
    name: Optional[str] = Field(None, description="Full personal name of the individual.")
    aadhaar_no: Optional[str] = Field(None, description="12-digit Indian national ID (Aadhaar).")
    pan_no: Optional[str] = Field(None, description="10-character Permanent Account Number (PAN).")
    father_name: Optional[str] = Field(None, description="Name of the individual's father.")
    mother_name: Optional[str] = Field(None, description="Name of the individual's mother.")
    dob: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format.")
    age: Optional[int | str] = Field(None, description="Age in years.")
    gender: Optional[str] = Field(None, description="Gender (Male/Female/Other).")
    phone: Optional[str] = Field(None, description="Contact phone number.")
    email: Optional[str] = Field(None, description="Email address.")
    occupation: Optional[str] = Field(None, description="Current profession or job title.")
    current_address: Optional[str] = Field(None, description="Residential address where they currently live.")
    address: Optional[str] = Field(None, description="Address of the individual.")
    role_in_case: Optional[str] = Field(None, description="Role: petitioner / respondent / witness / etc.")
    name_on_pan: Optional[str] = Field(None, description="Name exactly as it appears on the PAN card.")
    name_on_aadhaar: Optional[str] = Field(None, description="Name exactly as it appears on the Aadhaar card.")

class Judge(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: Optional[str] = Field(None, description="Personal name of the judge.")
    designation: Optional[str] = Field(None, description="Official title (e.g. Civil Judge, District Judge).")
    current_court: Optional[str] = Field(None, description="Name of the court where the judge is currently presiding.")
    uid_number: Optional[str] = Field(None, description="Unique identifier number assigned to the judge by the court system.")
    bar_enrollment_number: Optional[str] = Field(None, description="Registration number with the Bar Council.")
    status: Optional[str] = Field(None, description="Current appointment status (Active/Retired/Transferred).")

class Lawyer(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: Optional[str] = Field(None, description="Name of the advocate.")
    bar_number: Optional[str] = Field(None, description="Bar Council enrollment number.")
    aor_number: Optional[str] = Field(None, description="Advocate on Record (AOR) registration number.")
    designation: Optional[str] = Field(None, description="Senior Advocate / Junior / etc.")
    specialization: Optional[str] = Field(None, description="Legal specialization (e.g. Criminal, Taxation).")
    experience_years: Optional[int | str] = Field(None, description="Total years of practice.")
    years_of_practice: Optional[int | str] = Field(None, description="Number of years practicing in current court.")
    phone: Optional[str] = Field(None, description="Office or personal contact number.")
    email: Optional[str] = Field(None, description="Professional email address.")
    office_address: Optional[str] = Field(None, description="Full address of the law office.")
    contact_info: Optional[str] = Field(None, description="Other contact methods.")
    practice_areas: Optional[str] = Field(None, description="Specific types of cases handled.")
    enrollment_date: Optional[str] = Field(None, description="Date of enrollment with Bar Council.")
    status: Optional[str] = Field(None, description="Current status (Practicing/Suspended/etc.).")

class Case(BaseModel):
    model_config = ConfigDict(extra='allow')
    case_number: Optional[str] = Field(None, description="The official court case number.")
    cnr_number: Optional[str] = Field(None, description="The 16-character Case National Register (CNR) number.")
    title: Optional[str] = Field(None, description="The title of the case (e.g. A vs B).")
    case_type: Optional[str] = Field(None, description="Category of case (e.g. Criminal Appeal, Suit).")
    status: Optional[str] = Field(None, description="Current lifecycle status (Pending/Disposed).")
    stage: Optional[str] = Field(None, description="Current procedural stage (e.g. Evidence, Arguments).")
    filing_date: Optional[str] = Field(None, description="Date when the case was first filed.")
    disposal_date: Optional[str] = Field(None, description="Date when the case was decided/closed.")
    registration_date: Optional[str] = Field(None, description="Date when the case was officially registered.")
    first_hearing_date: Optional[str] = Field(None, description="Date of the first court hearing.")
    last_hearing_date: Optional[str] = Field(None, description="Date of the most recent court hearing.")
    next_hearing_date: Optional[str] = Field(None, description="Scheduled date for the next hearing.")
    decision_date: Optional[str] = Field(None, description="Date when the final judgment or order was passed.")
    filing_year: Optional[int | str] = Field(None, description="Year in which the case was filed.")
    filing_number: Optional[str] = Field(None, description="The official filing number assigned at the time of filing.")
    registration_number: Optional[str] = Field(None, description="The official registration number.")
    district: Optional[str] = Field(None, description="Judicial district where the case was filed.")
    state: Optional[str] = Field(None, description="Indian state where the court is located.")
    type_of_disposal: Optional[str] = Field(None, description="How the case was disposed (e.g. Dismissed, Allowed, Settled, Withdrawn).")
    in_favour_of: Optional[bool | str] = Field(None, description="True if decided in favour of petitioner, False if respondent, null if not decided.")
    alleged_amount: Optional[float | str] = Field(None, description="The principal amount involved in the dispute (in INR).")
    search_summary: Optional[str] = Field(None, description="A comprehensive, fact-dense English summary of the case including IDENTITY, TIMELINE, PARTIES, LEGAL, FINANCIAL, ASSETS, and PROCEEDINGS.")

class Organization(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: Optional[str] = Field(None, description="Full registered name of the company/trust/bank.")
    organization_type: Optional[str] = Field(None, description="Type: Privat Limited / PSU / NGO / etc.")
    cin: Optional[str] = Field(None, description="21-character Corporate Identification Number.")
    gstin: Optional[str] = Field(None, description="15-digit GST identification number.")
    pan: Optional[str] = Field(None, description="10-character PAN of the entity.")
    registration_number: Optional[str] = Field(None, description="Registration ID with relevant authority.")
    date_of_incorporation: Optional[str] = Field(None, description="Date of registration.")
    registered_at: Optional[str] = Field(None, description="Location/State where registered.")
    address: Optional[str] = Field(None, description="Full registered office address.")
    contact_info: Optional[str] = Field(None, description="Official phone or email.")
    website: Optional[str] = Field(None, description="Official URL.")

class Court(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: Optional[str] = Field(None, description="Full name of the court.")
    court_type: Optional[str] = Field(None, description="Type (e.g. High Court, District Court).")
    location: Optional[str] = Field(None, description="Specific location within the city.")
    district: Optional[str] = Field(None, description="Judicial district name.")
    state: Optional[str] = Field(None, description="Indian state name.")
    jurisdiction: Optional[str] = Field(None, description="The scope of this court's authority.")
    court_code: Optional[str] = Field(None, description="Internal ID or code for the court.")
    address: Optional[str] = Field(None, description="Physical address of the court building.")
    contact_info: Optional[str] = Field(None, description="Public contact details.")
    establishment_date: Optional[str] = Field(None, description="Date when the court was founded.")
    hierarchy_level: Optional[int | str] = Field(None, description="Level in the judicial hierarchy.")
    status: Optional[str] = Field(None, description="Current functional status.")
    court_overview: Optional[str] = Field(None, description="Description of the court's history/style.")

class Act(BaseModel):
    name: Optional[str] = Field(None, description="The name of the Act (e.g. IPC, NI Act).")
    year: Optional[int | str] = Field(None, description="The year the Act was passed.")
    short_name: Optional[str] = Field(None, description="Common abbreviation.")
    act_number: Optional[str] = Field(None, description="Official number assigned to the Act.")
    jurisdiction: Optional[str] = Field(None, description="Where the Act is applicable.")
    description: Optional[str] = Field(None, description="Summary of the Act's purpose.")

class Section(BaseModel):
    code: Optional[str] = Field(None, description="The section number/code (e.g. 138, 302).")
    act_name: Optional[str] = Field(None, description="Reference to the parent Act.")
    title: Optional[str] = Field(None, description="Name of the section.")
    description: Optional[str] = Field(None, description="Detailed text of the legal provision.")
    bailable: Optional[bool | str] = Field(None, description="Whether the offense is bailable.")

class CaseHearing(BaseModel):
    model_config = ConfigDict(extra='allow')
    date: Optional[str] = Field(None, description="Date of the specific hearing.")
    last_hearing_date: Optional[str] = Field(None, description="Date of the previous hearing before this one.")
    next_hearing_date: Optional[str] = Field(None, description="Date scheduled for the next hearing.")
    purpose: Optional[str] = Field(None, description="Reason for hearing (e.g. Admission, Evidence).")
    next_purpose: Optional[str] = Field(None, description="Purpose/reason scheduled for the next hearing.")
    # judge_designation: Optional[str] = Field(None, description="Title or designation of the presiding judge at this hearing.")
    business_notes: Optional[str] = Field(None, description="Clerk or court notes on what happened during this hearing.")
    nature_of_disposal: Optional[str] = Field(None, description="How this hearing ended (e.g. Adjourned, Ex-parte, Decided).")
    remarks: Optional[str] = Field(None, description="Additional remarks or observations from the court record.")

# class Address(BaseModel):
#     street: Optional[str] = Field(None, description="Street name and house number.")
#     locality: Optional[str] = Field(None, description="Area or neighborhood name.")
#     village: Optional[str] = Field(None, description="Village name (if applicable).")
#     city: Optional[str] = Field(None, description="City or Town name.")
#     district: Optional[str] = Field(None, description="District name.")
#     state: Optional[str] = Field(None, description="State name.")
#     postal_code: Optional[str] = Field(None, description="Pincode or Zip code.")
#     pincode: Optional[str] = Field(None, description="6-digit Indian Pincode.")
#     country: Optional[str] = Field(None, description="Country name.")
#     coordinates: Optional[str] = Field(None, description="GPS coordinates.")
#     address_line1: Optional[str] = Field(None, description="First line of address.")
#     address_line2: Optional[str] = Field(None, description="Second line of address.")
#     landmark: Optional[str] = Field(None, description="Nearby landmark.")
#     latitude: Optional[float] = Field(None, description="Geographic latitude.")
#     longitude: Optional[float] = Field(None, description="Geographic longitude.")
#     address_type: Optional[str] = Field(None, description="Type: Current / Permanent / Office / etc.")

# class State(BaseModel):
#     name: Optional[str] = Field(None, description="Full name of the state.")
#     state_code: Optional[str] = Field(None, description="Abbreviation (e.g. MH, DL).")
#     state_type: Optional[str] = Field(None, description="Type: State / Union Territory.")
#     code: Optional[str] = Field(None, description="ISO or census code.")

# class City(BaseModel):
#     name: Optional[str] = Field(None, description="Name of the city.")
#     district: Optional[str] = Field(None, description="District the city belongs to.")
#     state: Optional[str] = Field(None, description="State the city belongs to.")
#     city_code: Optional[str] = Field(None, description="Census or postal city code.")

class Asset(BaseModel):
    model_config = ConfigDict(extra='allow')
    asset_type: Optional[str] = Field(None, description="Type (Vehicle/Flat/Plot/etc).")
    identifier: Optional[str] = Field(None, description="Unique ID (Reg No, Flat No, etc).")
    description: Optional[str] = Field(None, description="Exact description from document.")
    address: Optional[str] = Field(None, description="Location of the asset.")
    estimated_value_inr: Optional[float | str] = Field(None, description="Monetary value in INR.")
    attributes: Optional[Dict[str, Any]] = Field(None, description="Floor, Wing, Area, or any additional facts.")

class Document(BaseModel):
    storage_id: Optional[str] = Field(None, description="Link to the PDF storage location.")
    order_date: Optional[str] = Field(None, description="Date of the specific order.")
    order_number: Optional[str] = Field(None, description="Official number for this document.")
    order_type: Optional[str] = Field(None, description="Category (Order, Judgement, Summons).")
    extraction_status: Optional[str] = Field(None, description="Status in processing pipeline.")

def get_presence_manifest(obj: BaseModel) -> Dict[str, bool]:
    """Returns a dict mapping attribute names to True (has data) or False (missing)."""
    return {k: v is not None and v != "" for k, v in obj.model_dump().items()}

def get_model_schema_description(cls: Any) -> Dict[str, str]:
    """Dynamically extracts field names and their descriptions for prompt building."""
    return {k: v.description for k, v in cls.model_fields.items()}

def get_compact_schema_description(cls: Any) -> str:
    """Returns a compact string 'field: desc' for the LLM prompt."""
    return "\n".join([f"- {k}: {v.description}" for k, v in cls.model_fields.items() if v.description])

class CaseStateTemplate(BaseModel):
    """Aggregate model uniting all distinct graph entities for LLM & DB passing."""
    search_summary: Optional[str] = None
    case_details: Case
    court: Court
    acts: List[Act] = Field(default_factory=list)
    hearings: List[CaseHearing] = Field(default_factory=list)
    documents: List[Document] = Field(default_factory=list)
    parties: List[Dict[str, Any]] = Field(default_factory=list)
    advocates: List[Dict[str, Any]] = Field(default_factory=list)
    judges: List[Judge] = Field(default_factory=list)
    assets: List[Asset] = Field(default_factory=list)
    missing_data_log: List[Dict[str, Any]] = Field(default_factory=list)
