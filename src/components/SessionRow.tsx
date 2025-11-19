import React from 'react';
import { StudySession } from '../types';
import { CheckCircleIcon, TrashIcon, ClockIcon, RepeatIcon, ListCheckIcon, FireIcon } from './Icons';

interface SessionRowProps {
  session: StudySession;
  onDelete: (id: string) => void;
  onEdit: (session: StudySession) => void;
  onLogRevision: (session: StudySession) => void;
}

const SessionRow: React.FC<SessionRowProps> = ({ session, onDelete, onEdit, onLogRevision }) => {
  
  // Calculated fields
  const nextDue = session.nextRevisionDate ? new Date(session.nextRevisionDate) : null;
  const isDue = nextDue && nextDue <= new Date();
  const isMastered = !session.nextRevisionDate && session.currentIntervalIndex >= session.revisionIntervals.length;
  
  // Formatting
  const dueDateStr = nextDue ? nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }) : 'Done';
  
  // Stats
  const totalMinutes = session.history.reduce((acc, log) => acc + log.durationMinutes, 0);
  
  // Anki Stats
  const ankiTotal = session.ankiTotal || 0;
  const ankiCovered = session.ankiCovered || 0;
  const ankiPercent = ankiTotal > 0 ? Math.min(100, Math.round((ankiCovered / ankiTotal) * 100)) : 0;
  
  // ToDo Stats
  const pendingTasks = session.toDoList?.filter(t => !t.done).length || 0;
  const totalTasks = session.toDoList?.length || 0;

  return (
    <div className={`group relative bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md ${isDue ? 'border-l-4 border-l-amber-400 border-slate-200 bg-amber-50/10' : 'border-slate-100'}`}>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        
        {/* Page Indicator */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[60px] h-14 bg-slate-100 rounded-lg border border-slate-200">
             <span className="text-[10px] text-slate-400 font-bold uppercase">PG</span>
             <span className="text-lg font-bold text-slate-700">{session.pageNumber}</span>
        </div>

        {/* Task Info */}
        <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onEdit(session)}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className={`font-semibold text-slate-800 truncate text-lg ${isMastered ? 'text-slate-500' : ''}`}>
              {session.topic}
            </h4>
            <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full uppercase font-bold tracking-wide border border-slate-200">
                {session.category}
            </span>
          </div>
          
          {/* Detail Row */}
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
             {/* Anki Bar */}
             <div className="flex items-center gap-2 min-w-[100px]">
                <FireIcon className={`w-3 h-3 ${ankiPercent === 100 ? 'text-orange-500' : 'text-slate-400'}`} />
                <div className="flex flex-col w-20">
                    <div className="flex justify-between text-[10px] mb-0.5">
                        <span>Anki</span>
                        <span>{ankiCovered}/{ankiTotal}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div className={`h-full rounded-full ${ankiPercent === 100 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${ankiPercent}%` }}></div>
                    </div>
                </div>
             </div>

             {/* Tasks */}
             {totalTasks > 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded border ${pendingTasks === 0 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <ListCheckIcon className="w-3 h-3" />
                    <span>{totalTasks - pendingTasks}/{totalTasks} Tasks</span>
                </div>
             )}

             <span className="flex items-center gap-1 pl-2 border-l border-slate-200">
                 <ClockIcon className="w-3 h-3" /> {Math.round(totalMinutes / 60 * 10) / 10}h
             </span>
             <span className="flex items-center gap-1">
                 <RepeatIcon className="w-3 h-3" /> 
                 {isMastered ? 'Mastered' : `Next: ${dueDateStr}`}
             </span>
             {isDue && <span className="text-amber-600 font-bold animate-pulse">● DUE</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-end">
            
            {/* Revision Button */}
            {!isMastered && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onLogRevision(session); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDue 
                        ? 'bg-primary text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <RepeatIcon className="w-4 h-4" />
                    {isDue ? 'Revise' : 'Log'}
                </button>
            )}

            {isMastered && (
                 <div className="p-2 rounded-lg bg-green-50 text-green-600 border border-green-100" title="Mastered">
                    <CheckCircleIcon className="w-5 h-5" />
                 </div>
            )}

            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                title="Delete Session"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
    </div>
  );
};

export default SessionRow;
