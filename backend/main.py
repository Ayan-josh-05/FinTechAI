from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.database import close_db
from .routes.detailedInfo import case, court
from .routes import auth
from .routes.querySearch.router import router as search_router

app = FastAPI(title="LegalAI API", description="API server for LegalAI frontend UI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.0.130:3000", "http://172.17.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(case.router, prefix="/entity/case", tags=["Case"])
app.include_router(court.router, prefix="/entity/court", tags=["Court"])
app.include_router(search_router, prefix="/search", tags=["Search"])


@app.on_event("shutdown")
def shutdown_event():
    close_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}
