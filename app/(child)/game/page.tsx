'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePoints } from '@/lib/usePoints';
import { Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MiniGame() {
  const router = useRouter();
  const { points, addPoints } = usePoints();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stars, setStars] = useState<{ id: number; left: number; top: number; delay: number }[]>([]);

  // Verbrauche 100 Punkte zum Starten
  useEffect(() => {
    if (points >= 100 && !isPlaying && timeLeft === 15) {
      addPoints(-100);
      setIsPlaying(true);
    } else if (points < 100 && !isPlaying && timeLeft === 15) {
      router.push('/dashboard');
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  // Generiere fallende / auftauchende Sterne
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setStars((prev) => [
          ...prev,
          {
            id: Date.now(),
            left: Math.random() * 80 + 10, // 10% to 90%
            top: Math.random() * 80 + 10,
            delay: Math.random() * 2,
          },
        ].slice(-10)); // max 10 stars on screen
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const catchStar = (id: number) => {
    if (!isPlaying) return;
    setScore((s) => s + 1);
    setStars((prev) => prev.filter((star) => star.id !== id));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-900 p-4 relative overflow-hidden text-white font-sans">
      
      <div className="absolute top-4 left-4 z-20">
        <Link href="/dashboard" className="flex items-center text-white/80 hover:text-white px-4 py-2 bg-black/20 rounded-full">
          <ArrowLeft className="mr-2" size={20} /> Zurück
        </Link>
      </div>

      <div className="z-20 text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 mb-4 drop-shadow-xl">
          Sternen-Jäger!
        </h1>
        {isPlaying ? (
          <div className="flex gap-8 justify-center text-2xl font-bold bg-white/10 px-8 py-4 rounded-3xl backdrop-blur-md">
            <div>Zeit: <span className={timeLeft <= 5 ? "text-red-400" : "text-green-300"}>{timeLeft}s</span></div>
            <div>Gefangen: <span className="text-yellow-400">{score} 🌟</span></div>
          </div>
        ) : timeLeft === 0 ? (
          <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-4">Zeit abgelaufen!</h2>
            <p className="text-xl mb-6">Du hast <span className="text-yellow-400 text-3xl font-extrabold">{score}</span> Sterne gefangen!</p>
            <Link href="/dashboard" className="bg-yellow-400 text-indigo-900 font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:bg-yellow-300 transition-colors inline-block">
              Zurück zum Dashboard
            </Link>
          </div>
        ) : (
          <div className="text-xl">Lade Spiel...</div>
        )}
      </div>

      {/* Game Area */}
      {isPlaying && (
        <div className="relative w-full max-w-4xl h-[60vh] bg-indigo-800/50 rounded-3xl border-4 border-indigo-500/30 overflow-hidden cursor-crosshair shadow-inner">
          {stars.map((star) => (
            <button
              key={star.id}
              onClick={() => catchStar(star.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-bounce transition-all"
              style={{ 
                left: `${star.left}%`, 
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `1s`
              }}
            >
              <Star size={64} className="text-yellow-400 fill-current drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] hover:scale-125 transition-transform" />
            </button>
          ))}
        </div>
      )}

      {/* Decorative stars */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
          <Star 
            key={i} 
            size={Math.random() * 20 + 10} 
            className="absolute fill-current animate-pulse" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`
            }} 
          />
        ))}
      </div>
    </div>
  );
}
