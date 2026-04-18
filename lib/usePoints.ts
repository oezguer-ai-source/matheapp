import { useState, useEffect } from 'react';

export function usePoints() {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const p = localStorage.getItem('mathe_points');
    if (p) setPoints(parseInt(p, 10));

    const handleStorageChange = () => {
      const sp = localStorage.getItem('mathe_points');
      if (sp) setPoints(parseInt(sp, 10));
    };

    window.addEventListener('points_updated', handleStorageChange);
    return () => window.removeEventListener('points_updated', handleStorageChange);
  }, []);

  const addPoints = (amount: number) => {
    const current = parseInt(localStorage.getItem('mathe_points') || '0', 10);
    const newPoints = current + amount;
    setPoints(newPoints);
    localStorage.setItem('mathe_points', newPoints.toString());
    window.dispatchEvent(new Event('points_updated'));
  };

  const resetPoints = () => {
    setPoints(0);
    localStorage.setItem('mathe_points', '0');
    window.dispatchEvent(new Event('points_updated'));
  };

  return { points, addPoints, resetPoints };
}
