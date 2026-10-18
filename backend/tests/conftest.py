"""
Pytest configuration — sets up an isolated temporary SQLite DB for each test.

Uses a named temp file so all connections within the same test see the same data,
avoiding the SQLite :memory: per-connection isolation issue.
"""
import os
import tempfile
import pytest
from contextlib import asynccontextmanager
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db


@pytest.fixture(scope="function")
def db():
    """Create a temp SQLite file, create all tables, seed data, yield a session, tear down."""
    # Ensure models are registered with Base.metadata before create_all
    import app.models.models  # noqa: F401

    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()

    from app.core.seeder import seed_all
    seed_all(session)

    try:
        yield session
    finally:
        session.close()
        engine.dispose()
        try:
            os.unlink(db_path)
        except OSError:
            pass


@pytest.fixture(scope="function")
def client(db, monkeypatch):
    """
    FastAPI test client with:
    - get_db overridden to use the temp-file test session
    - lifespan replaced with a no-op (tables already created by db fixture)
    """
    import app.core.database as _db_module
    import app.main as _main_module

    # Patch the module-level engine/SessionLocal so lifespan create_all + seed
    # operate on the same temp DB if they do run.
    test_engine = db.bind
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    monkeypatch.setattr(_db_module, "engine", test_engine)
    monkeypatch.setattr(_db_module, "SessionLocal", TestSessionLocal)

    # Replace lifespan with a no-op — tables and data already set up
    @asynccontextmanager
    async def noop_lifespan(app):
        yield

    _main_module.app.router.lifespan_context = noop_lifespan

    # Override DB dependency
    def override_get_db():
        yield db

    _main_module.app.dependency_overrides[get_db] = override_get_db

    with TestClient(_main_module.app, raise_server_exceptions=True) as c:
        yield c

    _main_module.app.dependency_overrides.clear()
