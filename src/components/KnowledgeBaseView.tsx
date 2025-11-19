
import React, { useState } from 'react';
import { KnowledgeBaseEntry, SYSTEMS, CATEGORIES, VideoResource } from '../types';
import { BookOpenIcon, VideoIcon, FireIcon, LinkIcon, PlusIcon, DatabaseIcon } from './Icons';

interface KnowledgeBaseViewProps {
  data: KnowledgeBaseEntry[];
  onUpdateEntry: (entry: KnowledgeBaseEntry) => void;
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ data, onUpdateEntry }) => {
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  
  // Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KnowledgeBaseEntry>>({});
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  const filteredData = data.filter(entry => {
    const matchSearch = entry.topic.toLowerCase().includes(search.toLowerCase()) || 
                        entry.pageNumber.includes(search);
    const matchSystem = selectedSystem ? entry.system === selectedSystem : true;
    return matchSearch && matchSystem;
  });

  const startEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.pageNumber);
    setEditForm({ ...entry });
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editForm.pageNumber) {
      onUpdateEntry(editForm as KnowledgeBaseEntry);
      setEditingId(null);
    }
  };

  const addVideoToEdit = () => {
    if (!newVideoUrl || !newVideoTitle) return;
    const currentVideos = editForm.videoLinks || [];
    setEditForm({
      ...editForm,
      videoLinks: [...currentVideos, { id: crypto.randomUUID(), title: newVideoTitle, url: newVideoUrl }]
    });
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const removeVideoFromEdit = (videoId: string) => {
    const currentVideos = editForm.videoLinks || [];
    setEditForm({
      ...editForm,
      videoLinks: currentVideos.filter(v => v.id !== videoId)
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <DatabaseIcon className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
            </div>
            <p className="text-slate-500 text-sm">Master list of First Aid pages, topics, and resources.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search Pages..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-full md:w-48"
          />
          <select 
            value={selectedSystem}
            onChange={e => setSelectedSystem(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-full md:w-40"
          >
            <option value="">All Systems</option>
            {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-24">Page #</th>
              <th className="p-4">Topic & Classification</th>
              <th className="p-4">Flashcards</th>
              <th className="p-4">Resources</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map(entry => {
              const isEditing = editingId === entry.pageNumber;

              if (isEditing) {
                return (
                  <tr key={entry.pageNumber} className="bg-indigo-50/30">
                    <td className="p-4 align-top font-bold text-slate-700">{entry.pageNumber}</td>
                    <td className="p-4 align-top space-y-2">
                        <input 
                          value={editForm.topic}
                          onChange={e => setEditForm({...editForm, topic: e.target.value})}
                          className="w-full p-1 border rounded text-sm font-bold mb-1"
                          placeholder="Topic Name"
                        />
                        <div className="flex gap-2">
                            <select 
                                value={editForm.system} 
                                onChange={e => setEditForm({...editForm, system: e.target.value})}
                                className="text-xs p-1 border rounded w-1/2"
                            >
                                {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select 
                                value={editForm.subject} 
                                onChange={e => setEditForm({...editForm, subject: e.target.value})}
                                className="text-xs p-1 border rounded w-1/2"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </td>
                    <td className="p-4 align-top">
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                value={editForm.ankiTotal}
                                onChange={e => setEditForm({...editForm, ankiTotal: parseInt(e.target.value)})}
                                className="w-16 p-1 border rounded text-sm"
                            />
                            <span className="text-xs text-slate-500">cards</span>
                        </div>
                    </td>
                    <td className="p-4 align-top">
                        <div className="space-y-2">
                            {editForm.videoLinks?.map(v => (
                                <div key={v.id} className="flex items-center justify-between bg-white border rounded px-2 py-1 text-xs">
                                    <span className="truncate max-w-[120px]">{v.title}</span>
                                    <button onClick={() => removeVideoFromEdit(v.id)} className="text-red-400 hover:text-red-600">&times;</button>
                                </div>
                            ))}
                            <div className="flex flex-col gap-1 mt-2 p-2 bg-white rounded border border-slate-200">
                                <input 
                                    placeholder="Video Title" 
                                    value={newVideoTitle}
                                    onChange={e => setNewVideoTitle(e.target.value)}
                                    className="text-xs p-1 border rounded"
                                />
                                <input 
                                    placeholder="URL" 
                                    value={newVideoUrl}
                                    onChange={e => setNewVideoUrl(e.target.value)}
                                    className="text-xs p-1 border rounded"
                                />
                                <button type="button" onClick={addVideoToEdit} className="text-xs bg-indigo-100 text-primary py-1 rounded font-medium">Add Link</button>
                            </div>
                        </div>
                    </td>
                    <td className="p-4 text-right align-top space-x-2">
                        <button onClick={saveEdit} className="text-xs bg-primary text-white px-3 py-1.5 rounded font-medium">Save</button>
                        <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={entry.pageNumber} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4 text-slate-400" />
                        {entry.pageNumber}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{entry.topic}</div>
                    <div className="text-xs text-slate-500 flex gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{entry.system || 'General'}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{entry.subject}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-slate-600 text-sm">
                        <FireIcon className="w-4 h-4 text-amber-500" />
                        {entry.ankiTotal || 0} Cards
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                        {entry.videoLinks && entry.videoLinks.length > 0 ? (
                            entry.videoLinks.map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <VideoIcon className="w-3 h-3" />
                                    {link.title}
                                </a>
                            ))
                        ) : (
                            <span className="text-xs text-slate-400 italic">No videos linked</span>
                        )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => startEdit(entry)} className="text-sm text-primary hover:text-indigo-700 font-medium">Edit</button>
                  </td>
                </tr>
              );
            })}
            
            {filteredData.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        No pages found in knowledge base. Start tracking pages to populate this list.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;
