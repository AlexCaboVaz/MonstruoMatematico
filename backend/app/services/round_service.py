"""
round_service.py
-----------------
Construye la cola de 12 cartas de una ronda:
  - 10 cartas nuevas: todos los hechos de la tabla del nivel actual
    (nivel x 1 ... nivel x 10), mezclados.
  - 2 cartas de repaso: los hechos con más `fail_count` de niveles ya
    superados (algoritmo de repetición espaciada).

Depende únicamente de la interfaz `AnalyticsRepository` (Inversión de
Dependencias), no de SQLAlchemy, lo que lo hace trivialmente testeable
con un repositorio falso en memoria.
"""
import random

from app.config import Settings
from app.repositories.interfaces import AnalyticsRepository
from app.schemas import Card, CardOption
from app.services.distractor_service import obtener_estrategia_para_nivel
from app.utils import build_operation_id


class RoundService:
    def __init__(self, analytics_repo: AnalyticsRepository, settings: Settings):
        self._analytics_repo = analytics_repo
        self._settings = settings

    def generar_ronda(self, player_id, nivel_actual: int) -> list[Card]:
        cartas_nuevas = self._generar_cartas_nivel_actual(nivel_actual)
        cartas_repaso = self._generar_cartas_de_repaso(player_id, nivel_actual)

        cola = cartas_nuevas + cartas_repaso

        # En niveles bajos (ej. nivel 1) puede no existir aún material
        # de repaso ("niveles anteriores"), dejando la ronda con menos
        # de 12 cartas. Como el economy de estrellas asume siempre 12
        # cartas = 4 estrellas, rellenamos con cartas extra del nivel
        # actual para que la cola tenga siempre el tamaño esperado.
        total_esperado = self._settings.cartas_nuevas_por_ronda + self._settings.cartas_repaso_por_ronda
        faltantes = total_esperado - len(cola)
        if faltantes > 0:
            cola += self._generar_cartas_relleno(nivel_actual, faltantes)

        random.shuffle(cola)
        return cola

    def _generar_cartas_nivel_actual(self, nivel_actual: int) -> list[Card]:
        factores_b = list(range(1, 11))
        random.shuffle(factores_b)
        cantidad = self._settings.cartas_nuevas_por_ronda
        return [
            self._construir_carta(nivel_actual, factor_b, nivel_actual)
            for factor_b in factores_b[:cantidad]
        ]

    def _generar_cartas_de_repaso(self, player_id, nivel_actual: int) -> list[Card]:
        limite = self._settings.cartas_repaso_por_ronda
        peores = self._analytics_repo.top_fallos_de_niveles_anteriores(
            player_id, nivel_actual, limite,
        )
        return [
            self._construir_carta(fila.factor_a, fila.factor_b, nivel_actual)
            for fila in peores
        ]

    def _generar_cartas_relleno(self, nivel_actual: int, cantidad: int) -> list[Card]:
        return [
            self._construir_carta(nivel_actual, random.randint(1, 10), nivel_actual)
            for _ in range(cantidad)
        ]

    def _construir_carta(self, factor_a: int, factor_b: int, nivel_para_dificultad: int) -> Card:
        respuesta_correcta = factor_a * factor_b
        estrategia = obtener_estrategia_para_nivel(nivel_para_dificultad)
        distractores = estrategia.generar(factor_a, factor_b, respuesta_correcta)

        opciones = [CardOption(valor=respuesta_correcta, es_correcta=True)]
        opciones += [CardOption(valor=v, es_correcta=False) for v in distractores]
        random.shuffle(opciones)

        return Card(
            operation_id=build_operation_id(factor_a, factor_b),
            factor_a=factor_a,
            factor_b=factor_b,
            opciones=opciones,
        )
