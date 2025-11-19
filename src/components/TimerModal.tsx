
import React, { useState, useEffect, useRef } from 'react';
import { PauseIcon, PlayIcon, StopIcon } from './Icons';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void; // Abort
  onFinish: (startTime: string, endTime: string) => void;
  topic: string;
}

const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onFinish, topic }) => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto start
      setStartTime(Date.now());
      setIsActive(true);
      setElapsed(0);
    } else {
      // Reset when closed
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsActive(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(Date.now() - (startTime || Date.now()));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, startTime]);

  const handleFinish = () => {
    if (!startTime) return;
    const end = new Date();
    const start = new Date(startTime);
    onFinish(start.toISOString(), end.toISOString());
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-full w-72 h-72 flex flex-col items-center justify-center shadow-2xl relative animate-fade-in-up border-4 border-indigo-100">
        <div className="absolute top-12 text-center px-6">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Studying</h3>
             <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{topic}</p>
        </div>

        <div className="text-5xl font-mono font-bold text-slate-800 my-4 tracking-tight">
          {formatTime(elapsed)}
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`p-4 rounded-full transition-all ${isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
          >
            {isActive ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={handleFinish}
            className="p-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all"
            title="Finish & Log"
          >
            <StopIcon className="w-6 h-6" />
          </button>
        </div>

        <button onClick={onClose} className="absolute bottom-8 text-xs text-slate-400 hover:text-slate-600 underline">
            Cancel
        </button>
      </div>
    </div>
  );
};

export default TimerModal;
