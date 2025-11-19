
import React, { useState, useEffect } from 'react';
import { StudyPlanItem, KnowledgeBaseEntry, VideoResource, ToDoItem } from '../types';
import { CalendarPlusIcon, VideoIcon, BookOpenIcon, LinkIcon, CheckCircleIcon, PlusIcon, FireIcon, PlayIcon, PencilSquareIcon, HistoryIcon, ChevronDownIcon, ListCheckIcon } from './Icons';

interface PlannerViewProps {
  plan: StudyPlanItem[];
  knowledgeBase: KnowledgeBaseEntry[];
  onAddToPlan: (item: Omit<StudyPlanItem, 'id'>, newVideo?: VideoResource) => void;
  onUpdatePlanItem: (item: StudyPlanItem) => void;
  onCompleteTask: (item: StudyPlanItem) => void;
  onStartTask: (item: StudyPlanItem) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ plan, knowledgeBase, onAddToPlan, onUpdatePlanItem, onCompleteTask, onStartTask }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudyPlanItem | null>(null);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'PAGE' | 'VIDEO'>('PAGE');
  const [pageNumber, setPageNumber] = useState('');
  const [topic, setTopic] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [ankiCount, setAnkiCount] = useState(0);
  
  // Sub-tasks for Plan
  const [subTasks, setSubTasks] = useState<ToDoItem[]>([]);
  const [newSubTask, setNewSubTask] = useState('');
  
  // Video specific
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  // Auto-fill effect
  useEffect(() => {
    if (!editingItem) {
        const kbEntry = knowledgeBase.find(k => k.pageNumber === pageNumber);
        if (kbEntry) {
            if (!topic) setTopic(kbEntry.topic);
            if (ankiCount === 0 && kbEntry.ankiTotal) setAnkiCount(kbEntry.ankiTotal);
        }
    }
  }, [pageNumber, knowledgeBase, topic, ankiCount, editingItem]);

  useEffect(() => {
      if (editingItem) {
          setDate(editingItem.date);
          setType(editingItem.type);
          setPageNumber(editingItem.pageNumber);
          setTopic(editingItem.topic);
          setEstimatedMinutes(editingItem.estimatedMinutes);
          setAnkiCount(editingItem.ankiCount || 0);
          setVideoUrl(editingItem.videoUrl || '');
          setSubTasks(editingItem.subTasks || []);
      } else {
          // Reset
          setDate(new Date().toISOString().split('T')[0]);
          setType('PAGE');
          setPageNumber('');
          setTopic('');
          setEstimatedMinutes(60);
          setAnkiCount(0);
          setVideoUrl('');
          setVideoTitle('');
          setSubTasks([]);
          setNewSubTask('');
      }
  }, [editingItem]);

  const handleAddSubTask = () => {
      if (!newSubTask.trim()) return;
      setSubTasks(prev => [...prev, { id: crypto.randomUUID(), text: newSubTask, done: false }]);
      setNewSubTask('');
  };

  const removeSubTask = (id: string) => {
      setSubTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
        onUpdatePlanItem({
            ...editingItem,
            date,
            type,
            pageNumber,
            topic,
            estimatedMinutes,
            ankiCount,
            videoUrl: type === 'VIDEO' ? videoUrl : undefined,
            subTasks: subTasks
        });
        setEditingItem(null);
    } else {
        let newVideo: VideoResource | undefined = undefined;
        if (type === 'VIDEO') {
            if (!videoUrl) return;
            newVideo = {
                id: crypto.randomUUID(),
                title: videoTitle || `Video for Pg ${pageNumber}`,
                url: videoUrl
            };
        }

        onAddToPlan({
            date,
            type,
            pageNumber,
            topic: topic || (type === 'VIDEO' ? videoTitle : `Page ${pageNumber}`),
            videoUrl: type === 'VIDEO' ? videoUrl : undefined,
            ankiCount: ankiCount > 0 ? ankiCount : undefined,
            estimatedMinutes,
            isCompleted: false,
            subTasks: subTasks,
            logs: [],
            totalMinutesSpent: 0
        }, newVideo);
    }
    
    setIsFormOpen(false);
  };

  // Carry Forward Logic: 
  // Show items if date is today OR (date < today AND not completed)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysPlan = plan.filter(p => {
      if (p.isCompleted && p.date < todayStr) return false; // Hide old completed
      if (p.date === todayStr) return true; // Always show today's
      if (p.date < todayStr && !p.isCompleted) return true; // Show overdue
      return false;
  });
  
  // Sort Today's plan: Overdue first, then by page number
  todaysPlan.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.pageNumber.localeCompare(b.pageNumber);
  });

  const upcomingPlan = plan.filter(p => p.date > todayStr);

  return (
    <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarPlusIcon className="w-6 h-6 text-primary" />
                    Study Planner
                </h2>
                <p className="text-slate-500 text-sm">Plan your daily targets. Incomplete tasks carry forward automatically.</p>
            </div>
            <button 
                onClick={() => { setEditingItem(null); setIsFormOpen(true); }} 
                className="bg-primary text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-600 transition-all"
            >
                <PlusIcon className="w-4 h-4" /> Add Target
            </button>
        </div>

        {/* Add/Edit Modal */}
        {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{editingItem ? 'Edit Target' : 'Add New Target'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setType('PAGE')} className={`p-2 rounded-lg border text-sm font-bold ${type === 'PAGE' ? 'bg-indigo-50 border-primary text-primary' : 'border-slate-200 text-slate-500'}`}>
                                Page Study
                            </button>
                            <button type="button" onClick={() => setType('VIDEO')} className={`p-2 rounded-lg border text-sm font-bold ${type === 'VIDEO' ? 'bg-indigo-50 border-primary text-primary' : 'border-slate-200 text-slate-500'}`}>
                                Video Watch
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-24">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Page #</label>
                                <input 
                                    type="text" 
                                    value={pageNumber} 
                                    onChange={e => setPageNumber(e.target.value)} 
                                    className="w-full p-2 border rounded-lg" 
                                    placeholder="456"
                                    required 
                                />
                            </div>
                            <div className="flex-grow">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topic</label>
                                <input 
                                    type="text" 
                                    value={topic} 
                                    onChange={e => setTopic(e.target.value)} 
                                    className="w-full p-2 border rounded-lg" 
                                    placeholder="Auto-fills from DB..."
                                />
                            </div>
                        </div>

                        {/* Sub Tasks Input */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Planned Topics / Sub-tasks</label>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                    type="text" 
                                    value={newSubTask} 
                                    onChange={e => setNewSubTask(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
                                    className="flex-grow p-2 border rounded text-sm" 
                                    placeholder="e.g. Mechanism, Treatment..." 
                                />
                                <button type="button" onClick={handleAddSubTask} className="px-3 bg-white border rounded font-bold text-slate-600 hover:bg-slate-100">+</button>
                             </div>
                             <div className="space-y-1 max-h-[100px] overflow-y-auto">
                                 {subTasks.map(t => (
                                     <div key={t.id} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-200 text-sm">
                                         <span>{t.text}</span>
                                         <button type="button" onClick={() => removeSubTask(t.id)} className="text-slate-400 hover:text-red-500">&times;</button>
                                     </div>
                                 ))}
                             </div>
                        </div>

                        {type === 'VIDEO' && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Video Title</label>
                                    <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full p-2 border rounded bg-white" placeholder="e.g. Osmosis Cardiac Output" required={!editingItem} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Video URL</label>
                                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full p-2 border rounded bg-white" placeholder="https://..." required />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Est. Duration (Min)</label>
                                <input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(parseInt(e.target.value))} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anki Cards</label>
                                <input type="number" value={ankiCount} onChange={e => setAnkiCount(parseInt(e.target.value))} className="w-full p-2 border rounded-lg" placeholder="0" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => { setIsFormOpen(false); setEditingItem(null); }} className="flex-1 p-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button type="submit" className="flex-1 p-2 bg-primary text-white rounded-lg font-bold shadow-md">{editingItem ? 'Update' : 'Add Target'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    Today's Targets 
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {todaysPlan.filter(p => !p.isCompleted).length} Pending
                    </span>
                </h3>
                <div className="space-y-3">
                    {todaysPlan.length > 0 ? todaysPlan.map(item => (
                         <PlanItemCard 
                            key={item.id} 
                            item={item} 
                            onComplete={() => onCompleteTask(item)}
                            onEdit={() => { setEditingItem(item); setIsFormOpen(true); }}
                            onStart={() => onStartTask(item)}
                            isOverdue={item.date < todayStr && !item.isCompleted}
                        />
                    )) : (
                        <p className="text-sm text-slate-400 italic">No targets active. Add one!</p>
                    )}
                </div>
            </div>
            <div>
                <h3 className="font-bold text-slate-800 mb-3">Upcoming</h3>
                <div className="space-y-3">
                    {upcomingPlan.length > 0 ? upcomingPlan.map(item => (
                         <PlanItemCard 
                            key={item.id} 
                            item={item} 
                            onComplete={() => onCompleteTask(item)}
                            onEdit={() => { setEditingItem(item); setIsFormOpen(true); }}
                            onStart={() => onStartTask(item)}
                        />
                    )) : (
                        <p className="text-sm text-slate-400 italic">No upcoming targets.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const PlanItemCard = ({ item, onComplete, onEdit, onStart, isOverdue }: { item: StudyPlanItem, onComplete: () => void, onEdit: () => void, onStart: () => void, isOverdue?: boolean }) => {
    const [expanded, setExpanded] = useState(false);

    // Stats
    const completedSubTasks = item.subTasks?.filter(t => t.done).length || 0;
    const totalSubTasks = item.subTasks?.length || 0;
    const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;
    const totalTime = item.totalMinutesSpent || 0;

    return (
        <div className={`rounded-xl border transition-all ${
            item.isCompleted 
            ? 'bg-slate-50 border-slate-100 opacity-60' 
            : isOverdue 
                ? 'bg-amber-50/30 border-amber-200 shadow-sm hover:shadow-md' 
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
        }`}>
            {isOverdue && <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 uppercase tracking-wide rounded-t-xl border-b border-amber-200">Carried Forward (Due {item.date})</div>}
            
            <div className="p-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'VIDEO' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-primary'}`}>
                        {item.type === 'VIDEO' ? <VideoIcon className="w-5 h-5" /> : <BookOpenIcon className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">PG {item.pageNumber}</span>
                            {item.type === 'VIDEO' && <a href={item.videoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Watch</a>}
                        </div>
                        <h4 className="font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{item.topic}</h4>
                        
                        {/* Progress Bar for Subtasks */}
                        {totalSubTasks > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>{completedSubTasks}/{totalSubTasks} Topics</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span>Plan: {item.estimatedMinutes}m</span>
                            {totalTime > 0 && (
                                <span className="flex items-center gap-1 text-indigo-600 font-bold">
                                    <HistoryIcon className="w-3 h-3" /> Done: {totalTime}m
                                </span>
                            )}
                            {item.ankiCount && item.ankiCount > 0 && (
                                <span className="flex items-center gap-1 text-amber-600 font-medium">
                                    <FireIcon className="w-3 h-3" /> {item.ankiCount} Cards
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                             {!item.isCompleted && (
                                <>
                                    <button onClick={onStart} className="p-2 bg-primary text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors" title="Start Timer & Log Session">
                                        <PlayIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={onComplete} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Quick Log">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                        <button onClick={() => setExpanded(!expanded)} className="self-end mt-2 text-slate-300 hover:text-slate-500">
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Detail View */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 rounded-b-xl space-y-4 text-sm">
                     {/* Subtasks List */}
                     {item.subTasks && item.subTasks.length > 0 && (
                         <div>
                             <h5 className="font-bold text-slate-600 text-xs uppercase mb-2">Tasks</h5>
                             <div className="space-y-1">
                                 {item.subTasks.map(t => (
                                     <div key={t.id} className="flex items-center gap-2">
                                         <div className={`w-3 h-3 rounded-full border ${t.done ? 'bg-green-500 border-green-500' : 'border-slate-300 bg-white'}`}></div>
                                         <span className={t.done ? 'text-slate-400 line-through' : 'text-slate-700'}>{t.text}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}

                     {/* Session Logs */}
                     {item.logs && item.logs.length > 0 && (
                         <div>
                             <h5 className="font-bold text-slate-600 text-xs uppercase mb-2">Session History</h5>
                             <div className="space-y-2">
                                 {item.logs.map((log, idx) => (
                                     <div key={log.id} className="flex justify-between text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                                         <span>Session {idx + 1} ({new Date(log.date).toLocaleDateString()})</span>
                                         <span className="font-mono font-bold">{log.durationMinutes} mins</span>
                                     </div>
                                 ))}
                                 <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200">
                                     <span>Total</span>
                                     <span>{item.totalMinutesSpent} mins</span>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     <div className="flex justify-end pt-2">
                        <button onClick={onEdit} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                            <PencilSquareIcon className="w-3 h-3" /> Edit Target Details
                        </button>
                     </div>
                </div>
            )}
        </div>
    );
};

export default PlannerView;
