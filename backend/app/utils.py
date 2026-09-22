"""
utils.py
--------
Funciones puras y pequeñas, reutilizadas por varias capas.
"""


def build_operation_id(factor_a: int, factor_b: int) -> str:
    """Construye una clave determinista para una operación,
    normalizando el orden de los factores (el menor primero) para que
    "3x7" y "7x3" se traten siempre como el mismo hecho matemático.
    """
    a, b = sorted((factor_a, factor_b))
    return f"{a}x{b}"


# Rangos de nivel -> fase visual del monstruo. Vive aquí, no en el
# frontend, porque `fase_monstruo` es un dato persistido en `players`
# y el backend debe ser la fuente única de verdad sobre en qué fase
# está el monstruo de cada jugador.
_RANGOS_FASE = (
    (1, 2, "bebe"),
    (3, 4, "infantil"),
    (5, 7, "joven"),
    (8, 10, "epica"),
)


def fase_para_nivel(nivel: int) -> str:
    for nivel_min, nivel_max, fase in _RANGOS_FASE:
        if nivel_min <= nivel <= nivel_max:
            return fase
    return "epica"  # nivel 10 es el tope; cualquier exceso queda en la fase final.
