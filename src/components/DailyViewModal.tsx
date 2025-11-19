import React from 'react';
import { StudySession } from '../types';
import { ClockIcon, BookOpenIcon } from './Icons';

interface DailyViewModalProps {
  isOpen: boolean;
  date: Date | null;
  onClose: () => void;
  sessions: StudySession[];
  onEditSession: (s: StudySession) => void;
}

const DailyViewModal: React.FC<DailyViewModalProps> = ({ isOpen, date, onClose, sessions, onEditSession }) => {
  if (!isOpen || !date) return null;

  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);

  const dailySessions = sessions.filter(s => {
      if (!s.nextRevisionDate) return false;
      const d = new Date(s.nextRevisionDate);
      return d >= date && d < nextDay;
  });

  const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Revisions for</h2>
                <p className="text-primary font-medium">{formattedDate}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
            {dailySessions.length > 0 ? (
                <div className="space-y-3">
                    {dailySessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => { onClose(); onEditSession(s); }}
                            className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center gap-3"
                        >
                             <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-600 flex-shrink-0">
                                <span className="text-[10px] font-bold uppercase">PG</span>
                                <span className="font-bold">{s.pageNumber}</span>
                             </div>
                             <div className="flex-grow">
                                 <h4 className="font-semibold text-slate-800">{s.topic}</h4>
                                 <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{s.category}</span>
                                    {s.toDoList && s.toDoList.filter(t => !t.done).length > 0 && (
                                        <span className="text-amber-600 font-medium">{s.toDoList.filter(t => !t.done).length} Tasks Pending</span>
                                    )}
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-slate-400">
                    <p>No revisions scheduled for this day.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DailyViewModal;
