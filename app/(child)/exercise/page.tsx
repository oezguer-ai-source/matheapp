'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateProblem, MathProblem } from '@/lib/mathEngine';
import { usePoints } from '@/lib/usePoints';
import { Star, ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

function ExerciseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gradeStr = searchParams.get('grade') || '1';
  const grade = parseInt(gradeStr, 10) as 1 | 2 | 3 | 4;

  const { points, addPoints } = usePoints();
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    setProblem(generateProblem(grade));
  }, [grade]);

  // Dynamisches Numpad falls die Lösung ein Minuszeichen braucht (bei späteren Klassen evtl)
  const handleNumpadClick = (num: string) => {
    if (feedback !== null) return;
    setInputVal((prev) => prev + num);
  };

  const handleDelete = () => {
    if (feedback !== null) return;
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!problem || inputVal === '' || feedback !== null) return;

    // Optional: Falls das Minus Zeichen getippt wurde (hier nur Positiv, aber sicherheitshalber)
    const answerNum = parseInt(inputVal, 10);
    if (answerNum === problem.answer) {
      setFeedback('correct');
      addPoints(10);
      setTimeout(() => {
        setProblem(generateProblem(grade));
        setInputVal('');
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setInputVal('');
        setFeedback(null);
      }, 1000);
    }
  };

  // Allow enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Backspace') handleDelete();
      if (!isNaN(parseInt(e.key))) handleNumpadClick(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputVal, problem, feedback]);

  if (!problem) return <div className="min-h-screen flex items-center justify-center text-xl text-blue-500 font-bold">Lade Aufgabe...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="absolute top-4 left-4 z-10">
        <Link href={`/dashboard?grade=${grade}`} className="flex items-center text-blue-500 font-bold bg-white px-4 py-2 rounded-full shadow-md hover:bg-blue-100 transition-colors">
          <ArrowLeft className="mr-2" size={20} /> Zurück
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center bg-yellow-400 text-white font-bold px-4 py-2 rounded-full shadow-md">
        <Star className="mr-2 fill-current" size={20} /> {points} Punkte
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-4 border-white z-10 relative">
        <h2 className="text-2xl font-bold text-gray-500 mb-6">Wie lautet das Ergebnis?</h2>
        
        <div className="text-5xl md:text-7xl font-extrabold text-blue-600 mb-8 tracking-wider">
          {problem.question}
        </div>

        <div className={clsx(
          "h-24 flex items-center justify-center rounded-2xl mb-8 text-5xl font-bold bg-gray-100 border-4 transition-all duration-300",
          feedback === 'correct' && "bg-green-100 border-green-500 text-green-600 transform scale-105",
          feedback === 'wrong' && "bg-red-100 border-red-500 text-red-600 translate-x-1",
          feedback === null && "border-transparent text-gray-800"
        )}>
          {inputVal || '?'}
          {feedback === 'correct' && <Check className="ml-4 text-green-500" size={48} />}
          {feedback === 'wrong' && <X className="ml-4 text-red-500" size={48} />}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumpadClick(num.toString())}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-3xl py-5 rounded-2xl shadow-sm transform transition-transform active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold text-lg py-5 rounded-2xl shadow-sm transform transition-transform active:scale-95 flex items-center justify-center"
          >
            Löschen
          </button>
          <button
            onClick={() => handleNumpadClick('0')}
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-3xl py-5 rounded-2xl shadow-sm transform transition-transform active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold text-xl py-5 rounded-2xl shadow-md transform transition-transform active:scale-95 flex items-center justify-center"
          >
            OK!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Exercise() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl text-blue-500 font-bold">Lade...</div>}>
      <ExerciseContent />
    </Suspense>
  );
}
