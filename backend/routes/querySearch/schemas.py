from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class SearchFields(BaseModel):
    case_number: Optional[str] = None
    cnr_number: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    judge_name: Optional[str] = None
    advocate_name: Optional[str] = None
    # Add other fields as needed
    class Config:
        extra = "allow"

class SearchFilters(BaseModel):
    class Config:
        extra = "allow"

class LegalDiscoverySearchRequest(BaseModel):
    type: str
    fields: SearchFields
    filters: Optional[SearchFilters] = None
    page: Optional[int] = 1
    page_size: Optional[int] = 10
    sort_by: Optional[str] = "date"

class SearchResponseCase(BaseModel):
    case_id: str
    case_name: str
    case_number: str
    cnr_number: str
    status: str
    risk: str
    court: Dict[str, Any]
    judge: Dict[str, Any]
    location: str
    case_summary: str

class LegalDiscoverySearchResponse(BaseModel):
    total: int
    page: int
    query_id: str
    cases: List[SearchResponseCase]
    search_query: Optional[Dict[str, Any]] = None
