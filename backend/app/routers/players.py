"""
routers/players.py
-------------------
Endpoints de la pantalla de creación de personaje y consulta de
estado del jugador (nombre, color, nivel, estrellas, fase visual).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_player_repo
from app.repositories.interfaces import PlayerRepository
from app.schemas import PlayerCreate, PlayerResponse

router = APIRouter(prefix="/api/players", tags=["players"])


@router.post("", response_model=PlayerResponse, status_code=201)
def crear_jugador(
    datos: PlayerCreate,
    player_repo: PlayerRepository = Depends(get_player_repo),
):
    """Pantalla de creación: nombre + color del slime -> '¡Despertar!'."""
    player = player_repo.crear(nombre=datos.nombre, color_base=datos.color_base)
    return player


@router.get("/{player_id}", response_model=PlayerResponse)
def obtener_jugador(
    player_id: UUID,
    player_repo: PlayerRepository = Depends(get_player_repo),
):
    player = player_repo.obtener_por_id(player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return player
