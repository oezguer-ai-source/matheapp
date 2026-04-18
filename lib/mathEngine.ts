type GradeLevel = 1 | 2 | 3 | 4;
type Operation = '+' | '-' | '*' | '/';

export interface MathProblem {
  question: string;
  answer: number;
  operation: Operation;
}

export function generateProblem(grade: GradeLevel): MathProblem {
  switch (grade) {
    case 1:
      // Klasse 1: Addition/Subtraktion bis 20
      const isAdd1 = Math.random() > 0.5;
      if (isAdd1) {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        return { question: `${a} + ${b}`, answer: a + b, operation: '+' };
      } else {
        const a = Math.floor(Math.random() * 10) + 10; // 10-19
        const b = Math.floor(Math.random() * 9) + 1;   // 1-9
        return { question: `${a} - ${b}`, answer: a - b, operation: '-' };
      }
    case 2:
      // Klasse 2: Addition/Subtraktion bis 100, kleines Einmaleins (Einführung)
      const op2 = Math.random();
      if (op2 < 0.4) {
        const a = Math.floor(Math.random() * 50) + 10;
        const b = Math.floor(Math.random() * 40) + 10;
        return { question: `${a} + ${b}`, answer: a + b, operation: '+' };
      } else if (op2 < 0.8) {
        const a = Math.floor(Math.random() * 50) + 50; 
        const b = Math.floor(Math.random() * 40) + 10;
        return { question: `${a} - ${b}`, answer: a - b, operation: '-' };
      } else {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        return { question: `${a} × ${b}`, answer: a * b, operation: '*' };
      }
    case 3:
      // Klasse 3: Addition/Subtraktion bis 1000, 1x1, einfache Division
      const op3 = Math.random();
      if (op3 < 0.3) {
        const a = Math.floor(Math.random() * 400) + 100;
        const b = Math.floor(Math.random() * 400) + 100;
        return { question: `${a} + ${b}`, answer: a + b, operation: '+' };
      } else if (op3 < 0.6) {
        const a = Math.floor(Math.random() * 400) + 500;
        const b = Math.floor(Math.random() * 400) + 100;
        return { question: `${a} - ${b}`, answer: a - b, operation: '-' };
      } else if (op3 < 0.8) {
        const a = Math.floor(Math.random() * 15) + 2;
        const b = Math.floor(Math.random() * 10) + 2;
        return { question: `${a} × ${b}`, answer: a * b, operation: '*' };
      } else {
        const divisor = Math.floor(Math.random() * 9) + 2; // 2-10
        const answer = Math.floor(Math.random() * 10) + 2; // 2-11
        const dividend = divisor * answer;
        return { question: `${dividend} ÷ ${divisor}`, answer: answer, operation: '/' };
      }
    case 4:
      // Klasse 4: Größere Zahlen, erweiterte Multiplikation/Division
      const op4 = Math.random();
      if (op4 < 0.3) {
        const a = Math.floor(Math.random() * 4000) + 1000;
        const b = Math.floor(Math.random() * 4000) + 1000;
        return { question: `${a} + ${b}`, answer: a + b, operation: '+' };
      } else if (op4 < 0.6) {
        const a = Math.floor(Math.random() * 4000) + 5000;
        const b = Math.floor(Math.random() * 4000) + 1000;
        return { question: `${a} - ${b}`, answer: a - b, operation: '-' };
      } else if (op4 < 0.8) {
        const a = Math.floor(Math.random() * 40) + 10;
        const b = Math.floor(Math.random() * 20) + 5;
        return { question: `${a} × ${b}`, answer: a * b, operation: '*' };
      } else {
        const divisor = Math.floor(Math.random() * 20) + 5; 
        const answer = Math.floor(Math.random() * 20) + 5; 
        const dividend = divisor * answer;
        return { question: `${dividend} ÷ ${divisor}`, answer: answer, operation: '/' };
      }
    default:
      return { question: "1 + 1", answer: 2, operation: '+' };
  }
}
