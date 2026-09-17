"""
routers/rounds.py
------------------
Endpoints del bucle principal de juego: generar la cola de 12 cartas
y registrar cada respuesta del niño.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_game_service, get_player_repo, get_round_service
from app.repositories.interfaces import PlayerRepository
from app.schemas import AnswerRequest, AnswerResponse, RoundResponse
from app.services.game_service import GameService
from app.services.round_service import RoundService

router = APIRouter(prefix="/api/players/{player_id}", tags=["rounds"])


@router.get("/round", response_model=RoundResponse)
def generar_ronda(
    player_id: UUID,
    nivel: int | None = Query(
        default=None,
        ge=1,
        le=10,
        description=(
            "Nivel opcional para practicar una tabla concreta (ej. "
            "'repetir la tabla anterior') SIN modificar el progreso "
            "guardado del jugador. Si se omite, se usa su nivel_actual."
        ),
    ),
    player_repo: PlayerRepository = Depends(get_player_repo),
    round_service: RoundService = Depends(get_round_service),
):
    player = player_repo.obtener_por_id(player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    nivel_para_ronda = nivel if nivel is not None else player.nivel_actual
    cartas = round_service.generar_ronda(player_id, nivel_para_ronda)
    return RoundResponse(player_id=player_id, cartas=cartas)


@router.post("/answer", response_model=AnswerResponse)
def enviar_respuesta(
    player_id: UUID,
    respuesta: AnswerRequest,
    game_service: GameService = Depends(get_game_service),
):
    return game_service.procesar_respuesta(player_id, respuesta)
