"""
sqlalchemy_repositories.py
---------------------------
Implementaciones concretas de las interfaces de `interfaces.py`
usando SQLAlchemy. Esta es la ÚNICA capa que escribe SQL/ORM; el
resto de la aplicación no sabe (ni le importa) que la BD es Postgres.
"""
from uuid import UUID

from sqlalchemy import func, greatest
from sqlalchemy.orm import Session

from app.models import Analytics, Inventory, Player, ShopItem
from app.repositories.interfaces import (
    AnalyticsRepository, InventoryRepository, PlayerRepository, ShopRepository,
)
from app.utils import build_operation_id


class SqlAlchemyPlayerRepository(PlayerRepository):
    def __init__(self, db: Session):
        self._db = db

    def crear(self, nombre: str, color_base: str) -> Player:
        player = Player(nombre=nombre, color_base=color_base)
        self._db.add(player)
        self._db.commit()
        self._db.refresh(player)
        return player

    def obtener_por_id(self, player_id: UUID) -> Player | None:
        return self._db.get(Player, player_id)

    def guardar(self, player: Player) -> Player:
        self._db.add(player)
        self._db.commit()
        self._db.refresh(player)
        return player


class SqlAlchemyAnalyticsRepository(AnalyticsRepository):
    def __init__(self, db: Session):
        self._db = db

    def obtener_por_operacion(self, player_id: UUID, operation_id: str) -> Analytics | None:
        return (
            self._db.query(Analytics)
            .filter_by(player_id=player_id, operation_id=operation_id)
            .first()
        )

    def registrar_resultado(
        self, player_id: UUID, operation_id: str,
        factor_a: int, factor_b: int, es_correcta: bool,
    ) -> Analytics:
        fila = self.obtener_por_operacion(player_id, operation_id)
        if fila is None:
            fila = Analytics(
                player_id=player_id,
                operation_id=operation_id,
                factor_a=min(factor_a, factor_b),
                factor_b=max(factor_a, factor_b),
                success_count=0,
                fail_count=0,
            )
            self._db.add(fila)

        if es_correcta:
            fila.success_count += 1
        else:
            fila.fail_count += 1
        fila.last_practiced_at = func.now()

        self._db.commit()
        self._db.refresh(fila)
        return fila

    def top_fallos_de_niveles_anteriores(
        self, player_id: UUID, nivel_actual: int, limite: int,
    ) -> list[Analytics]:
        # "Nivel anterior" = ambos factores pertenecen a tablas ya
        # superadas. Como el niño avanza de tabla en tabla (1..10),
        # un hecho pertenece por completo al pasado cuando incluso su
        # factor más grande es menor que el nivel en curso.
        return (
            self._db.query(Analytics)
            .filter(
                Analytics.player_id == player_id,
                greatest(Analytics.factor_a, Analytics.factor_b) < nivel_actual,
                Analytics.fail_count > 0,
            )
            .order_by(Analytics.fail_count.desc())
            .limit(limite)
            .all()
        )


class SqlAlchemyShopRepository(ShopRepository):
    def __init__(self, db: Session):
        self._db = db

    def listar_disponibles_para_nivel(self, nivel: int) -> list[ShopItem]:
        return (
            self._db.query(ShopItem)
            .filter(ShopItem.nivel_min <= nivel, ShopItem.nivel_max >= nivel)
            .all()
        )

    def obtener_por_id(self, item_id: int) -> ShopItem | None:
        return self._db.get(ShopItem, item_id)


class SqlAlchemyInventoryRepository(InventoryRepository):
    def __init__(self, db: Session):
        self._db = db

    def agregar(self, player_id: UUID, item_id: int) -> Inventory:
        item = Inventory(player_id=player_id, item_id=item_id)
        self._db.add(item)
        self._db.commit()
        self._db.refresh(item)
        return item

    def obtener_por_id(self, inventory_id: UUID) -> Inventory | None:
        return self._db.get(Inventory, inventory_id)

    def marcar_consumido(self, inventory_id: UUID) -> Inventory:
        item = self.obtener_por_id(inventory_id)
        item.consumido = True
        item.consumido_at = func.now()
        self._db.commit()
        self._db.refresh(item)
        return item

    def contar_pendientes(self, player_id: UUID) -> int:
        return (
            self._db.query(Inventory)
            .filter_by(player_id=player_id, consumido=False)
            .count()
        )

    def listar_pendientes(self, player_id: UUID) -> list[Inventory]:
        return (
            self._db.query(Inventory)
            .filter_by(player_id=player_id, consumido=False)
            .order_by(Inventory.comprado_at)
            .all()
        )
