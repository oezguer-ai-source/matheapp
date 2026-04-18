'use client';

import { useSearchParams } from 'next/navigation';
import { usePoints } from '@/lib/usePoints';
import Link from 'next/link';
import { Star, Play, Gamepad2 } from 'lucide-react';
import { Suspense } from 'react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const grade = searchParams.get('grade') || '1';
  const { points } = usePoints();

  const isGameUnlocked = points >= 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center border-4 border-blue-200">
        
        {/* Header Section */}
        <h1 className="text-4xl font-bold text-blue-600 mb-2">Dein Dashboard</h1>
        <p className="text-xl text-gray-500 mb-8">Klasse {grade}</p>

        {/* Points Display */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="bg-yellow-400 rounded-full p-4 mb-4 shadow-lg animate-bounce">
            <Star size={64} className="text-white fill-current" />
          </div>
          <h2 className="text-5xl font-extrabold text-yellow-500">{points} Punkte</h2>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-6 mt-6 mb-2">
            <div 
              className="bg-yellow-400 h-6 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min((points / 100) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-gray-500 font-medium">Sammle 100 Punkte für ein Spiel!</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <Link href={`/exercise?grade=${grade}`} className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xl font-bold rounded-2xl text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform transition-transform shadow-lg hover:-translate-y-1">
            <Play className="mr-2" /> Los Rechnen!
          </Link>

          {isGameUnlocked && (
            <Link href={`/game`} className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xl font-bold rounded-2xl text-white bg-purple-500 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform transition-transform shadow-lg shadow-purple-500/50 hover:-translate-y-1 animate-pulse">
              <Gamepad2 className="mr-2" /> Spiel spielen!
            </Link>
          )}

          <Link href="/" className="text-gray-400 hover:text-gray-600 mt-4 underline text-sm">
            Andere Klasse wählen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl text-blue-500 font-bold">Lade...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
