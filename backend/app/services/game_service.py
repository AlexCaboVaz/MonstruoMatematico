"""
game_service.py
----------------
Lógica de negocio al responder una carta:
  1. Registra el acierto/fallo en `analytics` (alimenta el repaso
     espaciado de futuras rondas).
  2. Decide, de forma autoritativa en el backend, si los aciertos
     acumulados en la ronda alcanzan el umbral para otorgar una
     estrella (evita que un cliente manipulado se auto-otorgue
     estrellas).

Nota de diseño (IMPORTANTE, corregido tras probar el juego): el
contador de aciertos NO se reinicia al fallar una carta. Cada una de
las 12 cartas de una ronda solo sale de la cola cuando se acierta (un
fallo solo la reenvía al final de la cola, nunca la elimina), así que
el número de ACIERTOS TOTALES en una ronda completa es siempre
exactamente 12, sin importar cuántas veces falle el niño por el
camino. Si el contador se reiniciara con cada fallo (como en la
primera versión), una ronda con algún error podía terminar sin las 4
estrellas prometidas — rompiendo la promesa de "cero frustración" y
dejando al jugador sin estrellas para la Nevera Mágica.

El contador en sí (`aciertos_ronda`) es estado efímero de la ronda en
curso y vive en el frontend (se reinicia a 0 al empezar cada ronda
nueva); lo único que el backend protege es el recurso económico
(`balance_estrellas`), que es el que de verdad importa persistir.
"""
from uuid import UUID

from app.config import Settings
from app.repositories.interfaces import AnalyticsRepository, PlayerRepository
from app.schemas import AnswerRequest, AnswerResponse


class GameService:
    def __init__(
        self,
        player_repo: PlayerRepository,
        analytics_repo: AnalyticsRepository,
        settings: Settings,
    ):
        self._player_repo = player_repo
        self._analytics_repo = analytics_repo
        self._settings = settings

    def procesar_respuesta(self, player_id: UUID, respuesta: AnswerRequest) -> AnswerResponse:
        self._analytics_repo.registrar_resultado(
            player_id=player_id,
            operation_id=respuesta.operation_id,
            factor_a=respuesta.factor_a,
            factor_b=respuesta.factor_b,
            es_correcta=respuesta.es_correcta,
        )

        # Solo avanza con los aciertos; un fallo NO resetea el contador
        # (ver nota de diseño en el docstring del módulo).
        nuevos_aciertos = respuesta.racha_actual + 1 if respuesta.es_correcta else respuesta.racha_actual
        estrella_otorgada = (
            respuesta.es_correcta
            and nuevos_aciertos % self._settings.aciertos_para_estrella == 0
        )

        player = self._player_repo.obtener_por_id(player_id)
        if estrella_otorgada:
            player.balance_estrellas += 1
            self._player_repo.guardar(player)

        return AnswerResponse(
            es_correcta=respuesta.es_correcta,
            nueva_racha=nuevos_aciertos,
            estrella_otorgada=estrella_otorgada,
            balance_estrellas=player.balance_estrellas,
        )
