"""
config.py
---------
Configuración centralizada de la aplicación. Aislar esto en un único
lugar evita "magic strings" repartidos por el código (ej. la URL de
conexión a la base de datos) y facilita cambiar de entorno
(desarrollo/test/producción) sin tocar lógica de negocio.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Variables de entorno de la aplicación (con valores por defecto
    pensados para desarrollo local)."""

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/monstruo_db"
    app_name: str = "Monstruo Matemático API"

    # Reglas de negocio configurables (evita hardcodear números mágicos
    # dispersos por los servicios).
    cartas_nuevas_por_ronda: int = 10
    cartas_repaso_por_ronda: int = 2
    aciertos_para_estrella: int = 3
    nivel_maximo: int = 10

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    """Devuelve una única instancia cacheada de Settings (patrón
    Singleton ligero, idiomático en FastAPI)."""
    return Settings()
