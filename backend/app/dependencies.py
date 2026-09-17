"""
dependencies.py
----------------
"Composition root" de la aplicación: el único lugar donde se decide
QUÉ implementación concreta de cada repositorio se usa. Los routers
piden servicios vía `Depends(...)`; los servicios solo conocen
interfaces abstractas (Inversión de Dependencias). Cambiar de motor de
persistencia en el futuro implicaría tocar únicamente este archivo.
"""
from fastapi import Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.repositories.sqlalchemy_repositories import (
    SqlAlchemyAnalyticsRepository, SqlAlchemyInventoryRepository,
    SqlAlchemyPlayerRepository, SqlAlchemyShopRepository,
)
from app.services.game_service import GameService
from app.services.round_service import RoundService
from app.services.shop_service import ShopService


def get_player_repo(db: Session = Depends(get_db)) -> SqlAlchemyPlayerRepository:
    return SqlAlchemyPlayerRepository(db)


def get_analytics_repo(db: Session = Depends(get_db)) -> SqlAlchemyAnalyticsRepository:
    return SqlAlchemyAnalyticsRepository(db)


def get_shop_repo(db: Session = Depends(get_db)) -> SqlAlchemyShopRepository:
    return SqlAlchemyShopRepository(db)


def get_inventory_repo(db: Session = Depends(get_db)) -> SqlAlchemyInventoryRepository:
    return SqlAlchemyInventoryRepository(db)


def get_round_service(
    analytics_repo=Depends(get_analytics_repo),
    settings: Settings = Depends(get_settings),
) -> RoundService:
    return RoundService(analytics_repo, settings)


def get_game_service(
    player_repo=Depends(get_player_repo),
    analytics_repo=Depends(get_analytics_repo),
    settings: Settings = Depends(get_settings),
) -> GameService:
    return GameService(player_repo, analytics_repo, settings)


def get_shop_service(
    shop_repo=Depends(get_shop_repo),
    inventory_repo=Depends(get_inventory_repo),
    player_repo=Depends(get_player_repo),
    settings: Settings = Depends(get_settings),
) -> ShopService:
    return ShopService(shop_repo, inventory_repo, player_repo, settings)
