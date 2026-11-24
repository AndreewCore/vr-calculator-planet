export type Operator = "+" | "-" | "*" | "/";
export type Key =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | Operator
  | "="
  | "C";

/** Máximo de dígitos permitidos en entradas y resultados (sin contar signo ni punto). */
export const MAX_DIGITS = 6;
export const ERROR_TEXT = "ERROR";

/**
 * Calculadora de cuatro operaciones con evaluación secuencial (como una calculadora de bolsillo:
 * 2 + 3 * 4 = 20). Cualquier entrada o resultado fuera de rango, o una división entre cero,
 * deja la calculadora en estado de error hasta pulsar C o empezar un número nuevo.
 */
export class Calculator {
  private current = "0";
  private accumulator: number | null = null;
  private pending: Operator | null = null;
  private waitingForOperand = false;
  private error = false;

  /** Texto que debe mostrar la pantalla. */
  get display(): string {
    return this.error ? ERROR_TEXT : this.current;
  }

  /** Operador pendiente (para mostrarlo como indicador en la pantalla), o null. */
  get pendingOperator(): Operator | null {
    return this.error ? null : this.pending;
  }

  /** Indica si la calculadora está en estado de error. */
  get hasError(): boolean {
    return this.error;
  }

  /** Procesa una tecla cualquiera y devuelve el texto de pantalla resultante. */
  press(key: Key): string {
    if (key === "C") this.clear();
    else if (key === "=") this.equals();
    else if (key === "+" || key === "-" || key === "*" || key === "/") this.setOperator(key);
    else this.inputDigit(key);
    return this.display;
  }

  /** Reinicia todo el estado, incluido el error. */
  clear(): void {
    this.current = "0";
    this.accumulator = null;
    this.pending = null;
    this.waitingForOperand = false;
    this.error = false;
  }

  /** Añade un dígito al número en curso; el séptimo dígito provoca ERROR. */
  inputDigit(digit: string): void {
    if (!/^[0-9]$/.test(digit)) throw new Error(`Dígito inválido: ${digit}`);
    // Tras un ERROR, teclear un número empieza una operación nueva en vez de bloquear al usuario.
    if (this.error) this.clear();

    if (this.waitingForOperand) {
      this.current = digit;
      this.waitingForOperand = false;
      return;
    }
    if (this.current === "0") {
      this.current = digit;
      return;
    }
    if (countDigits(this.current) >= MAX_DIGITS) {
      this.error = true;
      return;
    }
    this.current += digit;
  }

  /** Registra un operador, resolviendo antes la operación pendiente si la hay. */
  setOperator(op: Operator): void {
    if (this.error) return;
    // Pulsar dos operadores seguidos solo corrige el operador, no opera con el mismo número.
    if (this.pending !== null && !this.waitingForOperand) {
      this.resolvePending();
      if (this.error) return;
    } else if (this.pending === null) {
      this.accumulator = Number(this.current);
    }
    this.pending = op;
    this.waitingForOperand = true;
  }

  /** Resuelve la operación pendiente y muestra el resultado. */
  equals(): void {
    if (this.error || this.pending === null || this.waitingForOperand) return;
    this.resolvePending();
    this.pending = null;
  }

  /** Aplica el operador pendiente entre el acumulador y el número en pantalla. */
  private resolvePending(): void {
    const a = this.accumulator ?? 0;
    const b = Number(this.current);
    const result = compute(a, this.pending as Operator, b);
    const text = result === null ? null : formatResult(result);
    if (text === null) {
      this.error = true;
      return;
    }
    this.current = text;
    this.accumulator = Number(text);
    this.waitingForOperand = true;
  }
}

/** Cuenta solo los dígitos de un texto numérico (ignora signo y punto decimal). */
export function countDigits(text: string): number {
  return text.replace(/[^0-9]/g, "").length;
}

/** Calcula a <op> b; devuelve null en divisiones entre cero. */
export function compute(a: number, op: Operator, b: number): number | null {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? null : a / b;
  }
}

/**
 * Convierte un resultado en texto de pantalla con como mucho MAX_DIGITS dígitos.
 * Los decimales se recortan para caber; si la parte entera no cabe devuelve null (ERROR).
 */
export function formatResult(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const intDigits = Math.trunc(Math.abs(value)).toString().length;
  if (intDigits > MAX_DIGITS) return null;

  let text = value.toFixed(MAX_DIGITS - intDigits);
  if (text.includes(".")) text = text.replace(/\.?0+$/, "");
  // El redondeo puede añadir un dígito entero (999999.6 → 1000000), así que se vuelve a validar.
  if (countDigits(text.split(".")[0]) > MAX_DIGITS) return null;
  // Evita mostrar "-0" en resultados como -0.0000001.
  if (Number(text) === 0) return "0";
  return text;
}
