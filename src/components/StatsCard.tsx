import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { StudySession } from '../types';

interface StatsCardProps {
  sessions: StudySession[];
}

const StatsCard: React.FC<StatsCardProps> = ({ sessions }) => {
  const data = useMemo(() => {
    const dueNow = sessions.filter(s => s.nextRevisionDate && new Date(s.nextRevisionDate) <= new Date()).length;
    const mastered = sessions.filter(s => !s.nextRevisionDate && s.currentIntervalIndex > 0).length;
    const learning = sessions.filter(s => s.nextRevisionDate && new Date(s.nextRevisionDate) > new Date()).length;
    const ankiPending = sessions.filter(s => !s.ankiDone).length;

    const result = [
      { name: 'Due Now', value: dueNow, color: '#f59e0b' }, // Amber
      { name: 'Mastered', value: mastered, color: '#10b981' }, // Green
      { name: 'Learning', value: learning, color: '#3b82f6' }, // Blue
      { name: 'Anki Pending', value: ankiPending, color: '#94a3b8' }, // Gray
    ];
    return result.filter(item => item.value > 0);
  }, [sessions]);

  const totalHours = useMemo(() => {
    // Sum up all history logs
    return sessions.reduce((acc, curr) => {
        const sessionTotal = curr.history.reduce((hAcc, log) => hAcc + log.durationMinutes, 0);
        return acc + sessionTotal;
    }, 0) / 60;
  }, [sessions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Summary Metrics */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Study Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Pages</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{sessions.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Hours</p>
            <p className="text-3xl font-bold text-primary mt-1">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
             <p className="text-amber-600 text-xs font-medium uppercase tracking-wider">Due for Revision</p>
             <p className="text-3xl font-bold text-amber-700 mt-1">
                {sessions.filter(s => s.nextRevisionDate && new Date(s.nextRevisionDate) <= new Date()).length}
             </p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
             <p className="text-green-600 text-xs font-medium uppercase tracking-wider">Mastered</p>
             <p className="text-3xl font-bold text-green-700 mt-1">
                {sessions.filter(s => !s.nextRevisionDate && s.currentIntervalIndex > 0).length}
             </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Knowledge State</h3>
        <div className="flex-1 min-h-[200px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic">
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
