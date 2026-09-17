"""
main.py
-------
Punto de entrada de la API. Solo ensambla la app y registra routers;
no contiene lógica de negocio (Single Responsibility a nivel módulo).

También sirve el frontend estático (carpeta ../frontend) desde el
MISMO servidor: así, al desplegar, hay una única URL pública (sin
CORS entre dos orígenes, sin dos servicios que mantener), lo cual
además es justo lo que necesita PWABuilder para empaquetar un APK
real a partir de la web.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, engine
from app.routers import players, rounds, shop

settings = get_settings()

app = FastAPI(title=settings.app_name)

# Se mantiene por si en desarrollo alguien sirve el frontend en otro
# puerto (ej. Live Server); en producción, al ser un único origen,
# no hace falta, pero no molesta dejarlo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(rounds.router)
app.include_router(shop.router)


@app.on_event("startup")
def crear_tablas():
    # En producción esto se reemplaza por migraciones (ej. Alembic)
    # basadas en schema.sql; para desarrollo local basta con esto.
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


# ---------------------------------------------------------------------
# Frontend estático: se monta AL FINAL, después de las rutas de la
# API, para que /api/... siga resolviendo primero. html=True hace que
# also sirva index.html en "/" y en rutas desconocidas (necesario para
# que la PWA funcione bien al recargar).
# ---------------------------------------------------------------------
_frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
if _frontend_dir.exists():
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
