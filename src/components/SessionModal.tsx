
import React, { useState, useEffect } from 'react';
import { StudySession, CATEGORIES, DEFAULT_INTERVALS, ToDoItem, SYSTEMS, KnowledgeBaseEntry, StudyLog } from '../types';
import { SparklesIcon, BookOpenIcon, ListCheckIcon, XMarkIcon, PlusIcon, DatabaseIcon, CheckCircleIcon } from './Icons';
import { generateStudyChecklist } from '../services/geminiService';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Partial<StudySession> & { planUpdates?: { completedSubTaskIds: string[], isFinished: boolean } }) => void;
  initialData?: StudySession | null;
  prefillData?: any | null; 
  knowledgeBase?: KnowledgeBaseEntry[];
  planContext?: {
      planId: string;
      subTasks: ToDoItem[];
  } | null;
}

const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose, onSave, initialData, prefillData, knowledgeBase = [], planContext }) => {
  const [topic, setTopic] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [system, setSystem] = useState(SYSTEMS[0]);
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Anki Stats
  const [ankiCovered, setAnkiCovered] = useState<number>(0);
  const [ankiTotal, setAnkiTotal] = useState<number>(0);

  // To-Do List (Global Session)
  const [toDoList, setToDoList] = useState<ToDoItem[]>([]);
  const [newToDo, setNewToDo] = useState('');

  // Plan Specific Context
  const [planSubTasks, setPlanSubTasks] = useState<ToDoItem[]>([]);
  const [markPlanComplete, setMarkPlanComplete] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [revisionIntervals, setRevisionIntervals] = useState<number[]>(DEFAULT_INTERVALS);
  const [customIntervals, setCustomIntervals] = useState(DEFAULT_INTERVALS.join(', '));

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Init Plan Context
      if (planContext) {
          setPlanSubTasks(JSON.parse(JSON.stringify(planContext.subTasks))); // Deep copy to edit local status
          // Check if all are already done?
          const allDone = planContext.subTasks.length > 0 && planContext.subTasks.every(t => t.done);
          setMarkPlanComplete(allDone);
      } else {
          setPlanSubTasks([]);
          setMarkPlanComplete(false);
      }

      if (initialData) {
        setTopic(initialData.topic);
        setPageNumber(initialData.pageNumber);
        setCategory(initialData.category);
        setSystem(initialData.system || SYSTEMS[0]);
        setNotes(initialData.notes || '');
        
        // Anki
        setAnkiCovered(initialData.ankiCovered || 0);
        setAnkiTotal(initialData.ankiTotal || 0);

        // To-Do
        setToDoList(initialData.toDoList || []);

        setRevisionIntervals(initialData.revisionIntervals);
        setCustomIntervals(initialData.revisionIntervals.join(', '));

        // Try to extract time from history or fallback
        const lastLog = initialData.history[0];
        if (lastLog) {
             setDate(lastLog.date.split('T')[0]);
             setStartTime(new Date(lastLog.startTime).toTimeString().slice(0,5));
             setEndTime(new Date(lastLog.endTime).toTimeString().slice(0,5));
        } else {
             const d = new Date(initialData.lastStudied);
             setDate(d.toISOString().split('T')[0]);
             setStartTime(d.toTimeString().slice(0,5));
             setEndTime("00:00");
        }

      } else {
        // New Session State
        setTopic(prefillData?.topic || '');
        setPageNumber(prefillData?.pageNumber || '');
        setCategory(prefillData?.category || CATEGORIES[0]);
        setSystem(prefillData?.system || SYSTEMS[0]);
        setAnkiTotal(prefillData?.ankiTotal || 0);
        setAnkiCovered(0);
        setToDoList([]);
        setNewToDo('');
        setNotes('');
        setRevisionIntervals(DEFAULT_INTERVALS);
        setCustomIntervals(DEFAULT_INTERVALS.join(', '));
        
        // Time handling
        const now = new Date();
        
        // If prefill has precise start/end (from Timer)
        if (prefillData?.startTime && prefillData?.endTime) {
             const s = new Date(prefillData.startTime);
             const e = new Date(prefillData.endTime);
             setDate(s.toISOString().split('T')[0]);
             setStartTime(s.toTimeString().slice(0, 5));
             setEndTime(e.toTimeString().slice(0, 5));
        } else {
             setDate(now.toISOString().split('T')[0]);
             setStartTime(now.toTimeString().slice(0, 5));
             const end = new Date(now.getTime() + 60 * 60000);
             setEndTime(end.toTimeString().slice(0, 5));
        }
      }
    }
  }, [isOpen, initialData, prefillData, planContext]);

  // Knowledge Base Auto-Fill Logic
  useEffect(() => {
      if (!initialData && pageNumber && knowledgeBase) {
          const kbEntry = knowledgeBase.find(k => k.pageNumber === pageNumber);
          if (kbEntry) {
              if (!topic) setTopic(kbEntry.topic);
              if (kbEntry.subject) setCategory(kbEntry.subject);
              if (kbEntry.system) setSystem(kbEntry.system);
              if (ankiTotal === 0 && kbEntry.ankiTotal) setAnkiTotal(kbEntry.ankiTotal);
              if (!notes && kbEntry.notes) setNotes(kbEntry.notes);
          }
      }
  }, [pageNumber, initialData, knowledgeBase, topic, ankiTotal, notes]);

  const handleGeneratePlan = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const duration = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000));
      
      const checklist = await generateStudyChecklist(`${topic} (FA Page ${pageNumber})`, duration);
      const newItems: ToDoItem[] = checklist.map(item => ({
          id: crypto.randomUUID(),
          text: item,
          done: false
      }));
      setToDoList(prev => [...prev, ...newItems]);
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToDo = () => {
    if (!newToDo.trim()) return;
    setToDoList(prev => [...prev, { id: crypto.randomUUID(), text: newToDo, done: false }]);
    setNewToDo('');
  };

  const removeToDo = (id: string) => {
      setToDoList(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;
    const startObj = new Date(startISO);
    const endObj = new Date(endISO);
    const durationMinutes = Math.round((endObj.getTime() - startObj.getTime()) / 60000);

    if (durationMinutes <= 0) {
        alert("End time must be after start time");
        return;
    }

    const newHistoryLog: StudyLog = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        startTime: startISO,
        endTime: endISO,
        durationMinutes: durationMinutes,
        type: initialData ? 'REVISION' : 'INITIAL'
    };

    // Calculate plan updates
    let planUpdates = undefined;
    if (planContext) {
        planUpdates = {
            completedSubTaskIds: planSubTasks.filter(t => t.done).map(t => t.id),
            isFinished: markPlanComplete
        };
    }

    onSave({
      topic,
      pageNumber,
      category,
      system,
      ankiCovered,
      ankiTotal,
      ankiDone: ankiTotal > 0 && ankiCovered >= ankiTotal,
      notes,
      toDoList,
      revisionIntervals,
      lastStudied: startISO,
      history: [newHistoryLog],
      planUpdates
    } as any); 
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {initialData ? 'Edit Session' : 'Log Study Session'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* PLAN CONTEXT SECTION: If logging from a plan item */}
          {planContext && planSubTasks.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                      <ListCheckIcon className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wide">Planned Sub-Tasks</h3>
                  </div>
                  <div className="space-y-2 mb-3">
                      {planSubTasks.map(task => (
                          <label key={task.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-indigo-100 cursor-pointer hover:shadow-sm transition-shadow">
                              <input 
                                  type="checkbox" 
                                  checked={task.done}
                                  onChange={() => setPlanSubTasks(prev => prev.map(t => t.id === task.id ? {...t, done: !t.done} : t))}
                                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                              />
                              <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                  {task.text}
                              </span>
                          </label>
                      ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 pt-2 border-t border-indigo-200/50">
                      <input 
                        type="checkbox" 
                        checked={markPlanComplete} 
                        onChange={(e) => setMarkPlanComplete(e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500" 
                       />
                      Mark Planner Target as Fully Completed?
                  </label>
              </div>
          )}

          {/* Top Row: Page & Topic */}
          <div className="flex gap-4">
            <div className="w-28 flex-shrink-0">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Page #</label>
                <div className="relative group">
                    <BookOpenIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        required
                        type="text"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="456"
                    />
                    {/* DB Indicator */}
                    {knowledgeBase.some(k => k.pageNumber === pageNumber) && (
                        <div className="absolute -right-2 -top-2">
                            <DatabaseIcon className="w-4 h-4 text-green-500 bg-white rounded-full" />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-grow">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topic</label>
                <input
                    required
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="e.g. Cardiac Output"
                />
            </div>
          </div>

          {/* Category & System */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System</label>
              <select
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-sm"
              >
                {SYSTEMS.map(sys => <option key={sys} value={sys}>{sys}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-sm"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          {/* Anki */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anki Progress</label>
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-600">Done:</span>
                      <input 
                          type="number" 
                          value={ankiCovered}
                          onChange={e => setAnkiCovered(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-center text-sm"
                      />
                  </div>
                  <span className="text-slate-400">/</span>
                  <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-600">Total:</span>
                      <input 
                          type="number" 
                          value={ankiTotal}
                          onChange={e => setAnkiTotal(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-center text-sm"
                      />
                  </div>
              </div>
          </div>

          <hr className="border-slate-100" />

          {/* Time Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Session Time</label>
            <div className="grid grid-cols-3 gap-3">
                 <div className="col-span-1">
                     <input 
                        type="date" 
                        required 
                        value={date} 
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                     />
                 </div>
                 <div className="col-span-1 relative">
                     <span className="absolute left-2 top-2 text-xs text-slate-400">Start</span>
                     <input 
                        type="time" 
                        required 
                        value={startTime} 
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full pl-10 px-2 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                     />
                 </div>
                 <div className="col-span-1 relative">
                     <span className="absolute left-2 top-2 text-xs text-slate-400">End</span>
                     <input 
                        type="time" 
                        required 
                        value={endTime} 
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full pl-8 px-2 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                     />
                 </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              placeholder="Concepts to remember..."
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-indigo-600 shadow-lg shadow-indigo-200 transition-all"
            >
              {initialData ? 'Update Session' : 'Save & Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionModal;
