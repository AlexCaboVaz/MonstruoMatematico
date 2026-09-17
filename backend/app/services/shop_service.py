"""
shop_service.py
----------------
Lógica de la Nevera Mágica: qué comida está disponible según el
nivel, procesar una compra (descuenta estrellas), y procesar que el
niño "alimente" al monstruo (drag & drop en el frontend), lo que
puede disparar la evolución de nivel cuando ya no quedan ítems
pendientes de comer.
"""
from uuid import UUID

from app.config import Settings
from app.repositories.interfaces import InventoryRepository, PlayerRepository, ShopRepository
from app.schemas import EvolutionResponse, PendingFoodItem, PurchaseResponse, ShopItemResponse
from app.utils import fase_para_nivel


class SaldoInsuficienteError(Exception):
    """El jugador no tiene estrellas suficientes para esta compra."""


class ShopService:
    def __init__(
        self,
        shop_repo: ShopRepository,
        inventory_repo: InventoryRepository,
        player_repo: PlayerRepository,
        settings: Settings,
    ):
        self._shop_repo = shop_repo
        self._inventory_repo = inventory_repo
        self._player_repo = player_repo
        self._settings = settings

    def listar_disponibles(self, nivel: int) -> list[ShopItemResponse]:
        items = self._shop_repo.listar_disponibles_para_nivel(nivel)
        return [ShopItemResponse.model_validate(item) for item in items]

    def listar_pendientes(self, player_id: UUID) -> list[PendingFoodItem]:
        """Comida ya comprada y sin comer. El frontend la pinta cada
        vez que se abre la nevera, no solo justo tras comprar."""
        pendientes = self._inventory_repo.listar_pendientes(player_id)
        return [
            PendingFoodItem(
                inventory_id=fila.id,
                item=ShopItemResponse.model_validate(fila.item),
            )
            for fila in pendientes
        ]

    def comprar(self, player_id: UUID, item_id: int) -> PurchaseResponse:
        player = self._player_repo.obtener_por_id(player_id)
        item = self._shop_repo.obtener_por_id(item_id)

        if player.balance_estrellas < item.costo_estrellas:
            raise SaldoInsuficienteError(
                f"Necesitas {item.costo_estrellas} estrellas, tienes {player.balance_estrellas}."
            )

        player.balance_estrellas -= item.costo_estrellas
        self._player_repo.guardar(player)

        registro = self._inventory_repo.agregar(player_id, item_id)
        return PurchaseResponse(
            inventory_id=registro.id,
            balance_estrellas=player.balance_estrellas,
        )

    def alimentar(self, player_id: UUID, inventory_id: UUID) -> EvolutionResponse:
        """Marca un ítem como comido. Si con esto ya no quedan ítems
        pendientes en la nevera del jugador, el monstruo evoluciona
        de nivel (hasta el tope configurado)."""
        self._inventory_repo.marcar_consumido(inventory_id)

        player = self._player_repo.obtener_por_id(player_id)
        pendientes = self._inventory_repo.contar_pendientes(player_id)

        evoluciono = False
        if pendientes == 0 and player.nivel_actual < self._settings.nivel_maximo:
            player.nivel_actual += 1
            player.fase_monstruo = fase_para_nivel(player.nivel_actual)
            self._player_repo.guardar(player)
            evoluciono = True

        return EvolutionResponse(
            nivel_actual=player.nivel_actual,
            fase_monstruo=player.fase_monstruo,
            evoluciono=evoluciono,
        )
