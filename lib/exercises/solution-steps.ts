import type { Operator } from "./types";

export interface SolutionStep {
  text: string;
  highlight?: boolean;
}

/**
 * Generiert einen kindgerechten Rechenweg für eine Aufgabe.
 */
export function generateSolutionSteps(
  operand1: number,
  operand2: number,
  operator: Operator,
  correctAnswer: number
): SolutionStep[] {
  switch (operator) {
    case "+":
      return generateAdditionSteps(operand1, operand2, correctAnswer);
    case "-":
      return generateSubtractionSteps(operand1, operand2, correctAnswer);
    case "*":
      return generateMultiplicationSteps(operand1, operand2, correctAnswer);
    case "/":
      return generateDivisionSteps(operand1, operand2, correctAnswer);
  }
}

function generateAdditionSteps(a: number, b: number, result: number): SolutionStep[] {
  if (a <= 20 && b <= 20) {
    // Einfache Addition — direkter Weg
    return [
      { text: `Wir rechnen ${a} + ${b}` },
      { text: `${a} + ${b} = ${result}`, highlight: true },
    ];
  }

  // Zerlegen in Zehner und Einer
  const aZehner = Math.floor(a / 10) * 10;
  const aEiner = a % 10;
  const bZehner = Math.floor(b / 10) * 10;
  const bEiner = b % 10;
  const einerSumme = aEiner + bEiner;
  const zehnerSumme = aZehner + bZehner;

  return [
    { text: `Wir zerlegen die Zahlen:` },
    { text: `${a} = ${aZehner} + ${aEiner} und ${b} = ${bZehner} + ${bEiner}` },
    { text: `Zuerst die Zehner: ${aZehner} + ${bZehner} = ${zehnerSumme}` },
    { text: `Dann die Einer: ${aEiner} + ${bEiner} = ${einerSumme}` },
    { text: `Zusammen: ${zehnerSumme} + ${einerSumme} = ${result}`, highlight: true },
  ];
}

function generateSubtractionSteps(a: number, b: number, result: number): SolutionStep[] {
  if (a <= 20) {
    return [
      { text: `Wir rechnen ${a} - ${b}` },
      { text: `${a} - ${b} = ${result}`, highlight: true },
    ];
  }

  // Schrittweise abziehen
  const bZehner = Math.floor(b / 10) * 10;
  const bEiner = b % 10;

  if (bZehner === 0) {
    return [
      { text: `Wir rechnen ${a} - ${b}` },
      { text: `${a} - ${b} = ${result}`, highlight: true },
    ];
  }

  const zwischenergebnis = a - bZehner;
  return [
    { text: `Wir rechnen ${a} - ${b} in Schritten:` },
    { text: `Zuerst die Zehner abziehen: ${a} - ${bZehner} = ${zwischenergebnis}` },
    { text: `Dann die Einer abziehen: ${zwischenergebnis} - ${bEiner} = ${result}` },
    { text: `Also: ${a} - ${b} = ${result}`, highlight: true },
  ];
}

function generateMultiplicationSteps(a: number, b: number, result: number): SolutionStep[] {
  if (a <= 10 && b <= 10) {
    // Einmaleins
    return [
      { text: `Wir rechnen ${a} × ${b}` },
      { text: `Das ist die ${a}er-Reihe: ${a} × ${b} = ${result}`, highlight: true },
    ];
  }

  // Größere Zahlen zerlegen
  const bZehner = Math.floor(b / 10) * 10;
  const bEiner = b % 10;

  if (bZehner > 0 && bEiner > 0) {
    return [
      { text: `Wir zerlegen: ${a} × ${b} = ${a} × ${bZehner} + ${a} × ${bEiner}` },
      { text: `${a} × ${bZehner} = ${a * bZehner}` },
      { text: `${a} × ${bEiner} = ${a * bEiner}` },
      { text: `${a * bZehner} + ${a * bEiner} = ${result}`, highlight: true },
    ];
  }

  return [
    { text: `Wir rechnen ${a} × ${b}` },
    { text: `${a} × ${b} = ${result}`, highlight: true },
  ];
}

function generateDivisionSteps(a: number, b: number, result: number): SolutionStep[] {
  return [
    { text: `Wir rechnen ${a} ÷ ${b}` },
    { text: `Frage: Wie oft passt ${b} in ${a}?` },
    { text: `${b} × ${result} = ${a}` },
    { text: `Also: ${a} ÷ ${b} = ${result}`, highlight: true },
  ];
}

/**
 * Gibt eine Hilfestellung (Tipp) für den jeweiligen Aufgabentyp zurück.
 */
export function getHint(operator: Operator, operand1: number, operand2: number): string {
  switch (operator) {
    case "+":
      if (operand1 <= 20 && operand2 <= 20) {
        return "Tipp: Zähle vom größeren Wert weiter hoch!";
      }
      return "Tipp: Zerlege die Zahlen in Zehner und Einer. Rechne zuerst die Zehner zusammen, dann die Einer.";
    case "-":
      if (operand1 <= 20) {
        return "Tipp: Zähle vom größeren Wert rückwärts!";
      }
      return "Tipp: Ziehe zuerst die Zehner ab, dann die Einer. Schritt für Schritt!";
    case "*":
      if (operand1 <= 10 && operand2 <= 10) {
        return `Tipp: Denke an die ${Math.min(operand1, operand2)}er-Reihe! Zähle in ${Math.min(operand1, operand2)}er-Schritten.`;
      }
      return "Tipp: Zerlege die größere Zahl in Zehner und Einer und multipliziere einzeln.";
    case "/":
      return `Tipp: Überlege, wie oft die ${operand2} in die ${operand1} hineinpasst. Denke an die ${operand2}er-Reihe!`;
  }
}
