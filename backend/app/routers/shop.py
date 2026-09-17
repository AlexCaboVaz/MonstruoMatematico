"""
routers/shop.py
----------------
Endpoints de la Nevera Mágica: listar comida disponible según nivel,
procesar compras y procesar que el niño alimente al monstruo
(drag & drop en el frontend), lo que puede evolucionar al monstruo.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_player_repo, get_shop_service
from app.repositories.interfaces import PlayerRepository
from app.schemas import (
    EvolutionResponse, FeedRequest, PendingFoodItem, PurchaseRequest, PurchaseResponse,
    ShopItemResponse,
)
from app.services.shop_service import SaldoInsuficienteError, ShopService

router = APIRouter(prefix="/api/players/{player_id}", tags=["shop"])


@router.get("/shop-items", response_model=list[ShopItemResponse])
def listar_tienda(
    player_id: UUID,
    player_repo: PlayerRepository = Depends(get_player_repo),
    shop_service: ShopService = Depends(get_shop_service),
):
    player = player_repo.obtener_por_id(player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return shop_service.listar_disponibles(player.nivel_actual)


@router.get("/pending-food", response_model=list[PendingFoodItem])
def listar_comida_pendiente(
    player_id: UUID,
    shop_service: ShopService = Depends(get_shop_service),
):
    """Comida ya comprada y sin comer todavía (para que siga siendo
    visible/arrastrable al reabrir la nevera o recargar la página)."""
    return shop_service.listar_pendientes(player_id)


@router.post("/purchases", response_model=PurchaseResponse, status_code=201)
def comprar_item(
    player_id: UUID,
    compra: PurchaseRequest,
    shop_service: ShopService = Depends(get_shop_service),
):
    try:
        return shop_service.comprar(player_id, compra.item_id)
    except SaldoInsuficienteError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/feed", response_model=EvolutionResponse)
def alimentar_monstruo(
    player_id: UUID,
    datos: FeedRequest,
    shop_service: ShopService = Depends(get_shop_service),
):
    return shop_service.alimentar(player_id, datos.inventory_id)
