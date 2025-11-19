
import React, { useState, useEffect, useMemo } from 'react';
import { StudySession, FilterType, StudyLog, ToDoItem, KnowledgeBaseEntry, StudyPlanItem, VideoResource, CATEGORIES, PlanLog } from './types';
import { PlusIcon, ChartBarIcon, CalendarIcon, ListCheckIcon, DatabaseIcon, CalendarPlusIcon } from './components/Icons';
import SessionModal from './components/SessionModal';
import SessionRow from './components/SessionRow';
import StatsCard from './components/StatsCard';
import RevisionForecast from './components/RevisionForecast';
import LogRevisionModal from './components/LogRevisionModal';
import DailyViewModal from './components/DailyViewModal';
import GlobalTaskList from './components/GlobalTaskList';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import PlannerView from './components/PlannerView';
import TimerModal from './components/TimerModal';
import { analyzeProgress } from './services/geminiService';

type ViewMode = 'DASHBOARD' | 'TASKS' | 'DATABASE' | 'PLANNER';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>([]);
  
  const [filter, setFilter] = useState<FilterType>(FilterType.ALL);
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [dailyViewDate, setDailyViewDate] = useState<Date | null>(null);
  
  // Timer
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [activePlanItem, setActivePlanItem] = useState<StudyPlanItem | null>(null);

  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [revisingSession, setRevisingSession] = useState<StudySession | null>(null);
  
  // Prefill State
  const [sessionPrefill, setSessionPrefill] = useState<(Partial<StudySession> & { startTime?: string; endTime?: string }) | null>(null);

  // Load Data
  useEffect(() => {
    const savedSessions = localStorage.getItem('focusflow_sessions_v2');
    const savedKB = localStorage.getItem('focusflow_kb_v1');
    const savedPlan = localStorage.getItem('focusflow_plan_v2');

    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedKB) setKnowledgeBase(JSON.parse(savedKB));
    if (savedPlan) setStudyPlan(JSON.parse(savedPlan));
  }, []);

  // Save Data
  useEffect(() => { localStorage.setItem('focusflow_sessions_v2', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('focusflow_kb_v1', JSON.stringify(knowledgeBase)); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('focusflow_plan_v2', JSON.stringify(studyPlan)); }, [studyPlan]);

  const handleSaveSession = (data: any) => {
    // data contains: Partial<StudySession> + planUpdates: { completedSubTaskIds, isFinished }
    
    // 1. Update Global Sessions (History)
    const existingIndex = sessions.findIndex(s => s.pageNumber === data.pageNumber);
    let updatedSessions = [...sessions];
    
    // Extract log info passed from Modal
    const newLog = data.history ? data.history[0] : {
         id: crypto.randomUUID(),
         date: new Date().toISOString(),
         startTime: data.lastStudied,
         endTime: new Date(new Date(data.lastStudied).getTime() + 60*60000).toISOString(), 
         durationMinutes: 60,
         type: 'INITIAL'
    };

    // UPDATE or CREATE Global Session
    if (existingIndex >= 0) {
        const existing = sessions[existingIndex];
        
        // Calculate Revision Schedule
        const isDue = existing.nextRevisionDate && new Date(existing.nextRevisionDate) <= new Date();
        let nextIndex = existing.currentIntervalIndex;
        let nextRevision = existing.nextRevisionDate;
        
        if (isDue) {
             nextIndex = Math.min(existing.currentIntervalIndex + 1, existing.revisionIntervals.length - 1);
             const hours = existing.revisionIntervals[nextIndex];
             nextRevision = new Date(new Date(newLog.endTime).getTime() + hours * 60 * 60 * 1000).toISOString();
        } else if (!existing.nextRevisionDate) {
             nextIndex = 0;
             const hours = existing.revisionIntervals[0];
             nextRevision = new Date(new Date(newLog.endTime).getTime() + hours * 60 * 60 * 1000).toISOString();
        }

        updatedSessions[existingIndex] = {
            ...existing,
            topic: data.topic,
            notes: data.notes,
            ankiCovered: data.ankiCovered,
            ankiTotal: data.ankiTotal,
            ankiDone: data.ankiDone,
            toDoList: data.toDoList, 
            history: [newLog, ...existing.history],
            currentIntervalIndex: nextIndex,
            nextRevisionDate: nextRevision,
            lastStudied: newLog.startTime
        };
        setSessions(updatedSessions);
    } else {
        // Create New
        const intervalHours = data.revisionIntervals[0] || 24;
        const nextDue = new Date(new Date(newLog.endTime).getTime() + intervalHours * 60 * 60 * 1000).toISOString();

        const newSession: StudySession = {
            id: crypto.randomUUID(),
            topic: data.topic,
            pageNumber: data.pageNumber,
            category: data.category,
            system: data.system,
            ankiDone: data.ankiDone,
            ankiTotal: data.ankiTotal,
            ankiCovered: data.ankiCovered,
            toDoList: data.toDoList,
            revisionIntervals: data.revisionIntervals,
            currentIntervalIndex: 0,
            nextRevisionDate: nextDue,
            history: [newLog],
            notes: data.notes,
            lastStudied: newLog.startTime
        };
        setSessions([newSession, ...sessions]);
    }

    // 2. Update Knowledge Base
    updateKnowledgeBase(data);
    
    // 3. Handle Plan Item Progress (If linked to a plan item)
    // We use `activePlanItem` to identify which plan item launched this.
    // However, if user just logged manually and matched page number, we might want to update plan too?
    // For now, sticking to explicit link via activePlanItem
    if (activePlanItem) {
        const planUpdates = data.planUpdates;
        
        setStudyPlan(prev => prev.map(p => {
            if (p.id !== activePlanItem.id) return p;
            
            // Create a log specific to the plan item
            const planLog: PlanLog = {
                id: crypto.randomUUID(),
                date: newLog.date,
                durationMinutes: newLog.durationMinutes,
                notes: data.notes
            };

            // Update subtasks status
            let updatedSubTasks = p.subTasks;
            if (planUpdates && planUpdates.completedSubTaskIds) {
                updatedSubTasks = p.subTasks?.map(t => {
                    if (planUpdates.completedSubTaskIds.includes(t.id)) return { ...t, done: true };
                    // If explicitly unchecked in modal, handle that? Modal logic usually sends "completed IDs" based on checkbox state.
                    // Actually session modal sends current state. 
                    // Wait, SessionModal sends `completedSubTaskIds` based on the checkbox state in the modal.
                    // So we should probably trust the modal's view of "what is done".
                    // But be careful not to uncheck things if the modal didn't have full context? 
                    // SessionModal has full context of planSubTasks.
                    return t;
                });
                
                // Actually, simpler: Sync state from modal if passed
                // Since modal has the latest state of checkboxes for plan subtasks
                // But `planUpdates.completedSubTaskIds` is just IDs.
                updatedSubTasks = p.subTasks?.map(t => ({
                    ...t,
                    done: planUpdates.completedSubTaskIds.includes(t.id) || t.done // OR logic to prevent unchecking if not intended? 
                                                                                    // No, if user unchecks in modal, it should uncheck.
                })).map(t => ({
                    ...t,
                    done: planUpdates.completedSubTaskIds.includes(t.id)
                }));
            }

            return {
                ...p,
                logs: [...(p.logs || []), planLog],
                totalMinutesSpent: (p.totalMinutesSpent || 0) + newLog.durationMinutes,
                subTasks: updatedSubTasks,
                isCompleted: planUpdates ? planUpdates.isFinished : p.isCompleted
            };
        }));
        
        setActivePlanItem(null);
    }
  };

  // Helper to sync session data to KB
  const updateKnowledgeBase = (data: any) => {
    setKnowledgeBase(prev => {
        const existingIndex = prev.findIndex(k => k.pageNumber === data.pageNumber);
        if (existingIndex >= 0) {
            // Update existing entry
            const updated = [...prev];
            updated[existingIndex] = {
                ...updated[existingIndex],
                topic: data.topic,
                subject: data.category,
                system: data.system,
                ankiTotal: data.ankiTotal || updated[existingIndex].ankiTotal,
                notes: data.notes ? data.notes : updated[existingIndex].notes 
            };
            return updated;
        } else {
            // Create new entry
            return [...prev, {
                pageNumber: data.pageNumber,
                topic: data.topic,
                subject: data.category,
                system: data.system,
                ankiTotal: data.ankiTotal || 0,
                videoLinks: [],
                tags: [],
                notes: data.notes || ''
            }];
        }
    });
  };

  // Planner Actions
  const handleAddToPlan = (item: Omit<StudyPlanItem, 'id'>, newVideo?: VideoResource) => {
    setStudyPlan(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
    if (newVideo && item.pageNumber) {
        setKnowledgeBase(prev => {
            const exists = prev.find(k => k.pageNumber === item.pageNumber);
            if (exists) {
                return prev.map(k => k.pageNumber === item.pageNumber ? { ...k, videoLinks: [...k.videoLinks, newVideo] } : k);
            } else {
                return [...prev, {
                    pageNumber: item.pageNumber,
                    topic: item.topic,
                    subject: 'Other',
                    system: 'General Principles',
                    ankiTotal: 0,
                    videoLinks: [newVideo],
                    tags: [],
                    notes: ''
                }];
            }
        });
    }
  };

  const handleUpdatePlanItem = (item: StudyPlanItem) => {
      setStudyPlan(prev => prev.map(p => p.id === item.id ? item : p));
  };

  const handleStartTask = (item: StudyPlanItem) => {
      setActivePlanItem(item);
      setIsTimerOpen(true);
  };

  const handleCompletePlanItem = (item: StudyPlanItem) => {
      setActivePlanItem(item);
      // Prefill modal
      setSessionPrefill({
          topic: item.topic,
          pageNumber: item.pageNumber,
          ankiTotal: item.ankiCount || 0,
      });
      setEditingSession(null);
      setIsModalOpen(true);
  };

  const handleTimerFinish = (startTime: string, endTime: string) => {
      setIsTimerOpen(false);
      setSessionPrefill({
          topic: activePlanItem?.topic || '',
          pageNumber: activePlanItem?.pageNumber || '',
          ankiTotal: activePlanItem?.ankiCount || 0,
          startTime: startTime, 
          endTime: endTime      
      });
      setEditingSession(null);
      setIsModalOpen(true);
  };

  // Other Handlers
  const handleDeleteSession = (id: string) => {
      if (confirm('Delete study history?')) setSessions(prev => prev.filter(s => s.id !== id));
  };
  
  const handleRevisionComplete = (startISO: string, endISO: string, updatedNotes?: string, updatedTodos?: ToDoItem[]) => {
     if (!revisingSession) return;
     const start = new Date(startISO);
     const end = new Date(endISO);
     const duration = Math.round((end.getTime() - start.getTime()) / 60000);

     const newLog: StudyLog = {
         id: crypto.randomUUID(),
         date: new Date().toISOString(),
         startTime: startISO,
         endTime: endISO,
         durationMinutes: duration,
         type: 'REVISION'
     };

     const nextIndex = revisingSession.currentIntervalIndex + 1;
     let nextDate: string | null = null;
     if (nextIndex < revisingSession.revisionIntervals.length) {
         const hoursToAdd = revisingSession.revisionIntervals[nextIndex];
         nextDate = new Date(end.getTime() + hoursToAdd * 60 * 60 * 1000).toISOString();
     }

     const updatedSession: StudySession = {
         ...revisingSession,
         history: [newLog, ...revisingSession.history],
         currentIntervalIndex: nextIndex,
         nextRevisionDate: nextDate,
         lastStudied: endISO,
         notes: updatedNotes !== undefined ? updatedNotes : revisingSession.notes,
         toDoList: updatedTodos !== undefined ? updatedTodos : revisingSession.toDoList
     };

     setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
     setRevisingSession(null);
     
     if (updatedNotes) {
         setKnowledgeBase(prev => prev.map(k => k.pageNumber === revisingSession.pageNumber ? { ...k, notes: updatedNotes } : k));
     }
  };

  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    result.sort((a, b) => (a.nextRevisionDate ? new Date(a.nextRevisionDate).getTime() : Number.MAX_VALUE) - (b.nextRevisionDate ? new Date(b.nextRevisionDate).getTime() : Number.MAX_VALUE));
    
    if (filter === FilterType.DUE_TODAY) {
        const now = new Date();
        return result.filter(s => s.nextRevisionDate && new Date(s.nextRevisionDate) <= now);
    }
    if (filter === FilterType.MASTERED) return result.filter(s => !s.nextRevisionDate && s.currentIntervalIndex > 0);
    if (filter === FilterType.UPCOMING) return result.filter(s => s.nextRevisionDate);
    return result;
  }, [sessions, filter]);

  return (
    <div className="min-h-screen bg-background text-slate-800 font-sans selection:bg-primary/20">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <CalendarIcon className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FocusFlow</span>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setViewMode('DASHBOARD')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'DASHBOARD' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Dash</button>
                <button onClick={() => setViewMode('PLANNER')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'PLANNER' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}><CalendarPlusIcon className="w-3 h-3" /> Plan</button>
                <button onClick={() => setViewMode('TASKS')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'TASKS' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}><ListCheckIcon className="w-3 h-3" /> Tasks</button>
                <button onClick={() => setViewMode('DATABASE')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'DATABASE' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}><DatabaseIcon className="w-3 h-3" /> DB</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {viewMode === 'DASHBOARD' && (
            <>
                <StatsCard sessions={sessions} />
                <RevisionForecast sessions={sessions} onSelectDay={(d) => setDailyViewDate(d)} />
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                        {[
                            { label: 'All', val: FilterType.ALL },
                            { label: 'Due', val: FilterType.DUE_TODAY },
                            { label: 'Upcoming', val: FilterType.UPCOMING },
                            { label: 'Mastered', val: FilterType.MASTERED }
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => setFilter(opt.val as FilterType)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${filter === opt.val ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => { setEditingSession(null); setSessionPrefill(null); setIsModalOpen(true); }}
                        className="bg-primary hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
                    >
                    <PlusIcon className="w-4 h-4" /> Log Session
                    </button>
                </div>

                <div className="space-y-3">
                {filteredSessions.map(session => (
                    <SessionRow
                        key={session.id}
                        session={session}
                        onDelete={handleDeleteSession}
                        onEdit={(s) => { setEditingSession(s); setSessionPrefill(null); setIsModalOpen(true); }}
                        onLogRevision={(s) => { setRevisingSession(s); setIsRevisionModalOpen(true); }}
                    />
                ))}
                </div>
            </>
        )}

        {viewMode === 'PLANNER' && (
            <PlannerView 
                plan={studyPlan} 
                knowledgeBase={knowledgeBase} 
                onAddToPlan={handleAddToPlan}
                onUpdatePlanItem={handleUpdatePlanItem}
                onCompleteTask={handleCompletePlanItem}
                onStartTask={handleStartTask}
            />
        )}

        {viewMode === 'DATABASE' && (
            <KnowledgeBaseView 
                data={knowledgeBase} 
                onUpdateEntry={(entry) => setKnowledgeBase(prev => prev.map(k => k.pageNumber === entry.pageNumber ? entry : k))}
            />
        )}

        {viewMode === 'TASKS' && <GlobalTaskList sessions={sessions} onToggleTask={(sid, tid) => {
             setSessions(prev => prev.map(s => s.id !== sid ? s : { ...s, toDoList: s.toDoList?.map(t => t.id === tid ? { ...t, done: !t.done } : t) }));
        }} />}
      </main>

      {/* Modals */}
      <SessionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setTimeout(() => { setEditingSession(null); setSessionPrefill(null); setActivePlanItem(null); }, 300); }}
        onSave={(data) => {
             handleSaveSession(data);
        }}
        initialData={editingSession}
        prefillData={sessionPrefill}
        knowledgeBase={knowledgeBase}
        planContext={activePlanItem ? { planId: activePlanItem.id, subTasks: activePlanItem.subTasks || [] } : null}
      />

      <TimerModal 
          isOpen={isTimerOpen}
          onClose={() => setIsTimerOpen(false)}
          onFinish={handleTimerFinish}
          topic={activePlanItem?.topic || 'Study Session'}
      />

      {revisingSession && (
          <LogRevisionModal
            isOpen={isRevisionModalOpen}
            onClose={() => { setIsRevisionModalOpen(false); setRevisingSession(null); }}
            onConfirm={handleRevisionComplete}
            session={revisingSession}
          />
      )}

      <DailyViewModal
          isOpen={!!dailyViewDate}
          date={dailyViewDate}
          onClose={() => setDailyViewDate(null)}
          sessions={sessions}
          onEditSession={(s) => { setEditingSession(s); setIsModalOpen(true); }}
      />

    </div>
  );
};

export default App;
