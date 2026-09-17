"""
distractor_service.py
----------------------
Genera las 2 opciones incorrectas de cada carta. Implementado como
patrón Strategy: cada rango de niveles tiene su propia clase de
generación de distractores, todas intercambiables tras la misma
interfaz (Liskov) y añadibles sin modificar código existente
(Open/Closed) — basta con registrar una nueva estrategia en
`DISTRACTOR_STRATEGIES`.
"""
import random
from abc import ABC, abstractmethod


class DistractorStrategy(ABC):
    """Contrato común para cualquier generador de distractores."""

    @abstractmethod
    def generar(self, factor_a: int, factor_b: int, respuesta_correcta: int) -> list[int]:
        """Devuelve exactamente 2 números distintos entre sí, distintos
        de la respuesta correcta y positivos."""
        ...

    @staticmethod
    def _sanear(candidatos: set[int], respuesta_correcta: int) -> list[int]:
        """Filtra negativos/cero/duplicados/la respuesta correcta y
        devuelve exactamente 2 valores."""
        validos = [c for c in candidatos if c > 0 and c != respuesta_correcta]
        validos = list(dict.fromkeys(validos))  # quita duplicados preservando orden
        return validos[:2]


class FarDistractorStrategy(DistractorStrategy):
    """Niveles 1-3: distractores "lejanos" (ej. 4x2=8 -> 25, 41).
    En esta etapa el objetivo es que el niño reconozca visualmente el
    resultado correcto entre opciones claramente distintas, sin
    ambigüedad numérica que genere frustración."""

    def generar(self, factor_a: int, factor_b: int, respuesta_correcta: int) -> list[int]:
        candidatos: set[int] = set()
        intentos = 0
        while len(candidatos) < 2 and intentos < 20:
            intentos += 1
            salto = random.randint(10, 40)
            signo = random.choice([1, -1])
            candidato = respuesta_correcta + signo * salto
            if candidato > 0 and candidato != respuesta_correcta:
                candidatos.add(candidato)
        resultado = self._sanear(candidatos, respuesta_correcta)
        # Red de seguridad por si el azar no alcanzó 2 valores válidos.
        while len(resultado) < 2:
            resultado.append(respuesta_correcta + len(resultado) + 15)
        return resultado


class LogicalDistractorStrategy(DistractorStrategy):
    """Niveles 4-10: distractores "lógicos"/cercanos, basados en
    errores típicos de multiplicación (ej. 4x2=8 -> 7, 9, 12), para
    exigir más precisión a medida que el niño domina las tablas."""

    def generar(self, factor_a: int, factor_b: int, respuesta_correcta: int) -> list[int]:
        candidatos: set[int] = set()

        # Error típico 1: confundir con la tabla vecina (a x (b±1)).
        candidatos.add(factor_a * (factor_b + 1))
        candidatos.add(factor_a * max(factor_b - 1, 0))

        # Error típico 2: sumar en vez de multiplicar, o desviarse por
        # un pequeño margen (± 1, 2, 3) del resultado real.
        for delta in (1, 2, 3):
            candidatos.add(respuesta_correcta + delta)
            candidatos.add(respuesta_correcta - delta)

        resultado = self._sanear(candidatos, respuesta_correcta)
        random.shuffle(resultado)
        resultado = resultado[:2]

        while len(resultado) < 2:
            relleno = respuesta_correcta + random.randint(4, 8)
            if relleno != respuesta_correcta and relleno not in resultado:
                resultado.append(relleno)
        return resultado


# Registro de estrategias por rango de nivel. Añadir un nuevo tramo de
# dificultad es agregar una tupla aquí, sin tocar las clases existentes.
DISTRACTOR_STRATEGIES: list[tuple[int, int, DistractorStrategy]] = [
    (1, 3, FarDistractorStrategy()),
    (4, 10, LogicalDistractorStrategy()),
]


def obtener_estrategia_para_nivel(nivel: int) -> DistractorStrategy:
    for nivel_min, nivel_max, estrategia in DISTRACTOR_STRATEGIES:
        if nivel_min <= nivel <= nivel_max:
            return estrategia
    # Por defecto, si algún nivel no está cubierto, usamos la más
    # exigente (mejor fallar hacia "más difícil" que romper el juego).
    return LogicalDistractorStrategy()
