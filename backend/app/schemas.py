"""
schemas.py
----------
DTOs (Pydantic) que definen los contratos de entrada/salida de la API.
Mantenerlos separados de los modelos ORM (models.py) es intencional:
así el frontend nunca queda acoplado a detalles de persistencia
(columnas internas, nombres de tabla, etc.).
"""
import uuid
from typing import Literal

from pydantic import BaseModel, Field

ColorBase = Literal["verde", "azul", "rojo", "morado"]
FaseMonstruo = Literal["bebe", "infantil", "joven", "epica"]


# ---------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------
class PlayerCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    color_base: ColorBase


class PlayerResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    color_base: ColorBase
    nivel_actual: int
    balance_estrellas: int
    fase_monstruo: FaseMonstruo

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------
# Rondas / Cartas
# ---------------------------------------------------------------------
class CardOption(BaseModel):
    valor: int
    es_correcta: bool


class Card(BaseModel):
    operation_id: str
    factor_a: int
    factor_b: int
    opciones: list[CardOption]


class RoundResponse(BaseModel):
    player_id: uuid.UUID
    cartas: list[Card]


# ---------------------------------------------------------------------
# Respuestas del jugador a una carta
# ---------------------------------------------------------------------
class AnswerRequest(BaseModel):
    operation_id: str
    factor_a: int = Field(ge=1, le=10)
    factor_b: int = Field(ge=1, le=10)
    es_correcta: bool
    # Racha de aciertos consecutivos ANTES de esta respuesta. La posee
    # el frontend (es estado efímero de la ronda actual) y el backend
    # la usa solo para decidir, de forma autoritativa, si toca estrella.
    racha_actual: int = Field(ge=0, default=0)


class AnswerResponse(BaseModel):
    es_correcta: bool
    nueva_racha: int
    estrella_otorgada: bool
    balance_estrellas: int


# ---------------------------------------------------------------------
# Tienda (Nevera Mágica)
# ---------------------------------------------------------------------
class ShopItemResponse(BaseModel):
    id: int
    item_key: str
    nombre: str
    emoji: str
    costo_estrellas: int

    class Config:
        from_attributes = True


class PendingFoodItem(BaseModel):
    """Un ítem ya comprado, aún no dado de comer (pendiente en la
    nevera). Es lo que faltaba para que la comida comprada siga
    visible y arrastrable al reabrir la nevera o recargar la página."""
    inventory_id: uuid.UUID
    item: ShopItemResponse


class PurchaseRequest(BaseModel):
    item_id: int


class PurchaseResponse(BaseModel):
    inventory_id: uuid.UUID
    balance_estrellas: int


class FeedRequest(BaseModel):
    inventory_id: uuid.UUID


class FeedResponse(BaseModel):
    inventory_id: uuid.UUID
    consumido: bool


class EvolutionResponse(BaseModel):
    nivel_actual: int
    fase_monstruo: FaseMonstruo
    evoluciono: bool
