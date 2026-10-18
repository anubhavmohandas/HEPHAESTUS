"""
HEPHAESTUS FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base, SessionLocal
from app.core.seeder import seed_all
from app.api import scenarios, suites, runs, reports, targets, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="HEPHAESTUS",
    description="AI Security Testing & Resilience Lab",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(suites.router, prefix="/api/suites", tags=["Test Suites"])
app.include_router(runs.router, prefix="/api/runs", tags=["Test Runs"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(targets.router, prefix="/api/targets", tags=["Targets"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "HEPHAESTUS", "version": "1.0.0"}
