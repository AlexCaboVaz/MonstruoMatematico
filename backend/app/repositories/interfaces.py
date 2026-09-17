"""
interfaces.py
-------------
Contratos abstractos de persistencia (principio de Inversión de
Dependencias — la "D" de SOLID). Los servicios de negocio dependen
ÚNICAMENTE de estas interfaces, nunca de SQLAlchemy directamente.
Esto permite, por ejemplo, sustituir la implementación real por un
repositorio en memoria en los tests unitarios, sin tocar servicios.

También aplican Segregación de Interfaces (la "I" de SOLID): en vez
de un único "Repository" gigante, cada agregado (Player, Analytics,
Shop, Inventory) tiene su propio contrato pequeño y específico.
"""
from abc import ABC, abstractmethod
from uuid import UUID

from app.models import Analytics, Inventory, Player, ShopItem


class PlayerRepository(ABC):
    @abstractmethod
    def crear(self, nombre: str, color_base: str) -> Player: ...

    @abstractmethod
    def obtener_por_id(self, player_id: UUID) -> Player | None: ...

    @abstractmethod
    def guardar(self, player: Player) -> Player: ...


class AnalyticsRepository(ABC):
    @abstractmethod
    def obtener_por_operacion(self, player_id: UUID, operation_id: str) -> Analytics | None: ...

    @abstractmethod
    def registrar_resultado(
        self, player_id: UUID, operation_id: str,
        factor_a: int, factor_b: int, es_correcta: bool,
    ) -> Analytics:
        """Crea o actualiza (upsert) la fila de analítica para una operación."""
        ...

    @abstractmethod
    def top_fallos_de_niveles_anteriores(
        self, player_id: UUID, nivel_actual: int, limite: int,
    ) -> list[Analytics]:
        """Devuelve las operaciones con más fail_count cuyos dos
        factores pertenecen a niveles ya superados (< nivel_actual)."""
        ...


class ShopRepository(ABC):
    @abstractmethod
    def listar_disponibles_para_nivel(self, nivel: int) -> list[ShopItem]: ...

    @abstractmethod
    def obtener_por_id(self, item_id: int) -> ShopItem | None: ...


class InventoryRepository(ABC):
    @abstractmethod
    def agregar(self, player_id: UUID, item_id: int) -> Inventory: ...

    @abstractmethod
    def obtener_por_id(self, inventory_id: UUID) -> Inventory | None: ...

    @abstractmethod
    def marcar_consumido(self, inventory_id: UUID) -> Inventory: ...

    @abstractmethod
    def contar_pendientes(self, player_id: UUID) -> int:
        """Cuántos ítems comprados a este jugador aún no fueron
        dados de comer al monstruo (para saber cuándo evoluciona)."""
        ...

    @abstractmethod
    def listar_pendientes(self, player_id: UUID) -> list[Inventory]:
        """Ítems comprados y NO consumidos, con su ShopItem cargado.
        Sin esto, el frontend solo puede mostrar la comida recién
        comprada durante la misma sesión de panel abierto: al cerrar
        la nevera o recargar la página, la compra queda invisible
        aunque siga existiendo (y siga contando) en la base de datos."""
        ...
