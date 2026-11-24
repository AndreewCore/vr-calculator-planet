import { describe, expect, it } from "vitest";
import { Calculator, type Key } from "../src";

/** Pulsa una secuencia de teclas (separadas por espacios o como caracteres) y devuelve la pantalla. */
function run(sequence: string): string {
  const calc = new Calculator();
  for (const key of sequence.replace(/\s+/g, "")) calc.press(key as Key);
  return calc.display;
}

describe("Calculator", () => {
  it.each([
    ["2+3=", "5"],
    ["9-4=", "5"],
    ["3-5=", "-2"],
    ["6*7=", "42"],
    ["8/2=", "4"],
    ["10/3=", "3.33333"],
    ["2/3=", "0.66667"],
    ["2+3*4=", "20"],
    ["999999", "999999"],
    ["0007", "7"],
    ["5+*3=", "15"],
    ["10/3*3=", "9.99999"],
  ])("%s → %s", (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it.each([
    ["1234567", "séptimo dígito"],
    ["999999+1=", "resultado de 7 dígitos"],
    ["999999*999999=", "multiplicación grande"],
    ["0-999999-1=", "negativo de 7 dígitos"],
    ["5/0=", "división entre cero"],
    ["0/0=", "cero entre cero"],
    ["5/0+", "división entre cero encadenada"],
  ])("%s → ERROR (%s)", (seq) => {
    expect(run(seq)).toBe("ERROR");
  });

  it("C limpia el error", () => {
    expect(run("5/0=C")).toBe("0");
  });

  it("ignora operadores en estado de error", () => {
    expect(run("5/0=+3=")).toBe("3");
  });

  it("un dígito tras ERROR empieza de nuevo", () => {
    expect(run("1234567 8+1=")).toBe("9");
  });

  it("tras = un dígito empieza un número nuevo", () => {
    expect(run("2+3=7")).toBe("7");
  });

  it("se puede seguir operando con el resultado", () => {
    expect(run("2+3=*2=")).toBe("10");
  });
});
