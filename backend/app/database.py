"""
database.py
-----------
Configura el engine y las sesiones de SQLAlchemy. Es el único módulo
que sabe "cómo" se conecta la app a la base de datos; el resto del
código solo conoce la dependencia `get_db`, nunca el motor concreto
(esto es lo que permite, por ejemplo, cambiar Postgres por otro motor
SQL sin tocar repositorios ni servicios).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa de la que heredan todos los modelos ORM (models.py).
Base = declarative_base()


def get_db():
    """Dependencia de FastAPI: entrega una sesión de BD por request y
    garantiza su cierre incluso si la petición falla."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
