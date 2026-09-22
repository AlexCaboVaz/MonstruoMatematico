"""
models.py
---------
Modelos ORM (SQLAlchemy) que mapean 1:1 el esquema definido en
schema.sql. Esta capa solo describe la forma de los datos; no
contiene ninguna regla de negocio (eso vive en `services/`).
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey,
    Integer, SmallInteger, String, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(40), nullable=False)
    color_base = Column(String(20), nullable=False)
    nivel_actual = Column(SmallInteger, nullable=False, default=1)
    balance_estrellas = Column(Integer, nullable=False, default=0)
    fase_monstruo = Column(String(20), nullable=False, default="bebe")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    inventario = relationship("Inventory", back_populates="player", cascade="all, delete-orphan")
    analiticas = relationship("Analytics", back_populates="player", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("color_base IN ('verde','azul','rojo','morado')", name="ck_color_base"),
        CheckConstraint("nivel_actual BETWEEN 1 AND 10", name="ck_nivel_actual"),
        CheckConstraint("balance_estrellas >= 0", name="ck_balance_no_negativo"),
    )


class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_key = Column(String(50), nullable=False, unique=True)
    nombre = Column(String(60), nullable=False)
    emoji = Column(String(10), nullable=False)
    costo_estrellas = Column(SmallInteger, nullable=False)
    nivel_min = Column(SmallInteger, nullable=False)
    nivel_max = Column(SmallInteger, nullable=False)


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)
    consumido = Column(Boolean, nullable=False, default=False)
    comprado_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    consumido_at = Column(DateTime(timezone=True), nullable=True)

    player = relationship("Player", back_populates="inventario")
    item = relationship("ShopItem")


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    operation_id = Column(String(10), nullable=False)
    factor_a = Column(SmallInteger, nullable=False)
    factor_b = Column(SmallInteger, nullable=False)
    success_count = Column(Integer, nullable=False, default=0)
    fail_count = Column(Integer, nullable=False, default=0)
    last_practiced_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    player = relationship("Player", back_populates="analiticas")

    __table_args__ = (
        UniqueConstraint("player_id", "operation_id", name="uq_player_operation"),
    )
