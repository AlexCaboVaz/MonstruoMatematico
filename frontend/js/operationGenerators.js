/**
 * operationGenerators.js
 * ------------------------
 * Funciones puras: reciben un nivel ('facil' | 'medio' | 'dificil') y
 * devuelven un array de 20 operaciones `{ a, b, operador, respuesta }`,
 * SIN operaciones repetidas dentro de la misma ronda (ver
 * `generarSinRepetir`). No conocen el DOM ni el estado del juego —
 * por eso son triviales de testear y de reutilizar. `MathWorld` es
 * quien las consume.
 */

const OPERACIONES_POR_NIVEL = 20;

function entero(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera `cantidad` operaciones distintas entre sí, llamando a
 * `candidatoFn()` una y otra vez hasta reunirlas (descarta las que ya
 * habían salido). Si el rango de un nivel es tan pequeño que no
 * llegan a existir 20 combinaciones únicas posibles, rellena lo que
 * falte permitiendo alguna repetición como red de seguridad — mejor
 * eso que devolver una ronda incompleta.
 */
function generarSinRepetir(candidatoFn, cantidad = OPERACIONES_POR_NIVEL) {
  const vistos = new Set();
  const operaciones = [];
  const maxIntentos = cantidad * 50;
  let intentos = 0;

  while (operaciones.length < cantidad && intentos < maxIntentos) {
    intentos += 1;
    const op = candidatoFn();
    const clave = `${op.a}${op.operador}${op.b}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      operaciones.push(op);
    }
  }

  while (operaciones.length < cantidad) {
    operaciones.push(candidatoFn()); // red de seguridad, rango agotado
  }

  return operaciones;
}

/**
 * Suma:
 *  - facil:   sumandos pequeños con el resultado hasta 25 (antes se
 *             quedaba en un solo dígito; se sube un poco para que no
 *             se quede corto ni para el nivel de aprendizaje).
 *  - medio:   ambos sumandos entre 10 y 50, sin restricción de llevadas.
 *  - dificil: ambos sumandos entre 50 y 100, FORZANDO llevada
 *             (la suma de las unidades de a y b es >= 10).
 */
export function generarSuma(nivel) {
  return generarSinRepetir(() => {
    let a;
    let b;

    if (nivel === 'facil') {
      a = entero(1, 20);
      b = entero(1, 25 - a); // garantiza a + b <= 25
    } else if (nivel === 'medio') {
      a = entero(10, 50);
      b = entero(10, 50);
    } else {
      do {
        a = entero(50, 100);
        b = entero(50, 100);
      } while ((a % 10) + (b % 10) < 10);
    }

    return { a, b, operador: '+', respuesta: a + b };
  });
}

/**
 * Multiplicación "libre" (distinta de las Tablas de Multiplicar):
 *  - facil:   una tabla del 1 al 5 por un número del 1 al 10.
 *  - medio:   una tabla del 6 al 10 por un número del 1 al 10.
 *  - dificil: un número de dos cifras (10-99) por uno de una cifra (2-9).
 */
export function generarMultiplicacionLibre(nivel) {
  return generarSinRepetir(() => {
    let a;
    let b;

    if (nivel === 'facil') {
      a = entero(1, 5);
      b = entero(1, 10);
    } else if (nivel === 'medio') {
      a = entero(6, 10);
      b = entero(1, 10);
    } else {
      a = entero(10, 99);
      b = entero(2, 9);
    }

    return { a, b, operador: '×', respuesta: a * b };
  });
}

/**
 * Resta:
 *  - facil:   minuendo hasta 25 (antes se quedaba en un solo dígito),
 *             sin necesidad de pedir prestado.
 *  - medio:   ambos números de dos cifras (10-60), sin restricción extra.
 *  - dificil: números de tres cifras (100-500), FORZANDO que haya que
 *             pedir prestado (las unidades del minuendo son menores que
 *             las del sustraendo).
 */
export function generarResta(nivel) {
  return generarSinRepetir(() => {
    let a;
    let b;

    if (nivel === 'facil') {
      a = entero(10, 25);
      b = entero(1, a - 1);
    } else if (nivel === 'medio') {
      a = entero(20, 60);
      b = entero(10, a - 1);
    } else {
      do {
        a = entero(100, 500);
        b = entero(100, a - 1);
      } while ((a % 10) >= (b % 10));
    }

    return { a, b, operador: '-', respuesta: a - b };
  });
}

/**
 * División (siempre exacta, sin decimales ni resto). Rangos ampliados
 * respecto a la primera versión: con divisor 2-3 y cociente 2-5 solo
 * existían 8 combinaciones posibles en "fácil" — menos que las 20
 * operaciones de una ronda, así que se repetían sí o sí. Ahora cada
 * nivel tiene de sobra para 20 operaciones distintas:
 *  - facil:   divisor 2-5, cociente 2-10   (36 combinaciones posibles)
 *  - medio:   divisor 4-9, cociente 4-12   (54 combinaciones posibles)
 *  - dificil: divisor 10-20, cociente 10-20 (121 combinaciones posibles)
 */
export function generarDivision(nivel) {
  return generarSinRepetir(() => {
    let divisor;
    let cociente;

    if (nivel === 'facil') {
      divisor = entero(2, 5);
      cociente = entero(2, 10);
    } else if (nivel === 'medio') {
      divisor = entero(4, 9);
      cociente = entero(4, 12);
    } else {
      divisor = entero(10, 20);
      cociente = entero(10, 20);
    }

    const dividendo = divisor * cociente; // división exacta garantizada
    return { a: dividendo, b: divisor, operador: '÷', respuesta: cociente };
  });
}
