import Link from "next/link";
import { GraduationCap, Star, BookOpen, Calculator } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 text-center">
        
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-400 p-4 rounded-full animate-bounce shadow-lg shadow-yellow-400/50">
            <Star size={48} className="text-white fill-current" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6 font-sans">
          Mathe-Held
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-700 mb-12 font-medium">
          Wähle deine Klasse und werde zum Mathe-Profi!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Grade 1 */}
          <Link href="/dashboard?grade=1" className="group">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-8 rounded-2xl shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-2xl">
              <div className="flex items-center justify-between mb-4 text-white">
                <h2 className="text-3xl font-bold">1. Klasse</h2>
                <BookOpen size={32} />
              </div>
              <p className="text-green-50 text-lg text-left">Plus & Minus bis 20</p>
            </div>
          </Link>

          {/* Grade 2 */}
          <Link href="/dashboard?grade=2" className="group">
            <div className="bg-gradient-to-br from-orange-400 to-red-500 p-8 rounded-2xl shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-2xl">
              <div className="flex items-center justify-between mb-4 text-white">
                <h2 className="text-3xl font-bold">2. Klasse</h2>
                <Calculator size={32} />
              </div>
              <p className="text-orange-50 text-lg text-left">Bis 100 & erstes 1x1</p>
            </div>
          </Link>

          {/* Grade 3 */}
          <Link href="/dashboard?grade=3" className="group">
            <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-8 rounded-2xl shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-2xl">
              <div className="flex items-center justify-between mb-4 text-white">
                <h2 className="text-3xl font-bold">3. Klasse</h2>
                <GraduationCap size={32} />
              </div>
              <p className="text-blue-50 text-lg text-left">Bis 1000, 1x1 & Division</p>
            </div>
          </Link>

          {/* Grade 4 */}
          <Link href="/dashboard?grade=4" className="group">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-8 rounded-2xl shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-2xl">
              <div className="flex items-center justify-between mb-4 text-white">
                <h2 className="text-3xl font-bold">4. Klasse</h2>
                <Star size={32} />
              </div>
              <p className="text-purple-50 text-lg text-left">Große Zahlen & Profi-Mathe</p>
            </div>
          </Link>
        </div>

        <div className="text-sm text-gray-500 border-t pt-6">
          Premium B2B Version für Lehrkräfte &mdash; Schüler spielen kostenlos!
        </div>
      </div>
    </div>
  );
}
