import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { AddVideoModal } from './components/AddVideoModal';
import { 
  Sparkles, Lock, Plus, List, Grid, Layout, Menu, X, Loader2, 
  BookOpen, BarChart3, Tags, Settings, FileJson, UploadCloud, 
  RefreshCcw, Database, FileSpreadsheet, LayoutGrid 
} from 'lucide-react';
import { searchVideosWithAI } from './services/geminiService';
import { logEvent, initLoggerSession, syncLogsWithCloud, downloadLogsAsCsv, downloadLogsAsJson } from './services/logger';
import { Documentation } from './components/Documentation';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TagManager } from './components/TagManager';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './services/firebase';

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '',
    selectedProfiles: [],
    selectedTopics: [],
    aiSearchActive: false,
    shortsFilter: 'all'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoEntry | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [view, setView] = useState<'directory' | 'docs' | 'analytics' | 'tags'>('directory');
  
  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const fetched = await videoStorage.getAll();
        setVideos(fetched);
        await syncLogsWithCloud();
        await initLoggerSession();
      } catch (e) { 
        console.error("App Init Failed:", e); 
      } finally { 
        setIsLoading(false); 
      }
    };
    initApp();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, 'admin@thehireground.com', passwordInput);
      setIsAdminMode(true);
      setShowPasswordModal(false);
      setPasswordError(false);
      setPasswordInput('');
      await logEvent('ADMIN_LOGIN_SUCCESS');
    } catch (error) {
      setPasswordError(true); 
    }
  };

  const handleResetApp = async () => {
    if (window.confirm("⚠️ CLOUD FACTORY RESET ⚠️\n\nThis will permanently delete all videos in Firestore and restore the master catalog. Activity logs will be saved.")) {
        try {
            await logEvent('ADMIN_FACTORY_RESET_START');
            await videoStorage.reset(); 
            sessionStorage.clear(); // Clear session but keep localStorage logs
            window.location.reload();
        } catch (e) {
            alert("Reset failed.");
        }
    }
  };

  const handleAiSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiSearching(true);
    setFilterState(prev => ({ ...prev, searchQuery: '', aiSearchActive: false }));
    try {
        const ids = await searchVideosWithAI(aiQuery, videos);
        setAiResultIds(ids || []);
        setFilterState(prev => ({ ...prev, aiSearchActive: true }));
        await logEvent('AI_SEARCH', `Prompt: "${aiQuery}"`);
    } catch (err) {
        setAiResultIds([]);
    } finally {
        setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResultIds(null);
    setFilterState(prev => ({ ...prev, aiSearchActive: false, searchQuery: '' }));
  };

  const allProfiles = useMemo(() => Array.from(new Set(videos.flatMap(v => v.guestProfiles || []))).sort(), [videos]);
  const allTopics = useMemo(() => Array.from(new Set(videos.flatMap(v => v.topics || []))).sort(), [videos]);
  const allAudiences = useMemo(() => Array.from(new Set(videos.flatMap(v => v.targetAudience || []))).sort(), [videos]);

  const filteredVideos = useMemo(() => {
    let result = [...videos];
    if (filterState.aiSearchActive && aiResultIds) {
      result = result.filter(v => aiResultIds.includes(v.id));
    } else if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.guestName?.toLowerCase().includes(q) ||
        v.topics?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterState.selectedProfiles.length > 0) {
      result = result.filter(v => filterState.selectedProfiles.every(p => v.guestProfiles?.includes(p)));
    }
    if (filterState.selectedTopics.length > 0) {
      result = result.filter(v => filterState.selectedTopics.every(t => v.topics?.includes(t)));
    }
    if (filterState.shortsFilter === 'shorts') {
      result = result.filter(v => v.isShort === 'Y');
    } else if (filterState.shortsFilter === 'videos') {
      result = result.filter(v => v.isShort !== 'Y');
    }
    return result.sort((a, b) => ((b.publishedAt || b.createdAt) as number) - ((a.publishedAt || a.createdAt) as number));
  }, [videos, filterState, aiResultIds]);

  const handleVideoAdd = async (newVideo: Omit<VideoEntry, 'id' | 'createdAt'>) => {
      const completeVideo: VideoEntry = { ...newVideo, id: crypto.randomUUID(), createdAt: Date.now() };
      const updatedList = await videoStorage.add(completeVideo); 
      setVideos(updatedList);
      setIsModalOpen(false);
      await logEvent('VIDEO_ADDED', completeVideo.title);
  };

  const handleVideoUpdate = async (id: string, updates: Partial<VideoEntry>) => {
      const updatedList = await videoStorage.update(id, updates);
      setVideos(updatedList); 
      setIsModalOpen(false);
      setEditingVideo(null);
  };

  const handleVideoDelete = async (id: string) => {
      if (window.confirm("Permanently delete this episode?")) {
          const updatedList = await videoStorage.delete(id);
          setVideos(updatedList);
          setIsModalOpen(false);
          await logEvent('VIDEO_DELETED', id);
      }
  };

  const downloadVideosAsJson = () => {
    const blob = new Blob([JSON.stringify(videos, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hire_ground_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-blue-600">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <FilterSidebar 
          videos={videos} filterState={filterState} setFilterState={setFilterState}
          availableProfiles={allProfiles} availableTopics={allTopics}
          isOpenMobile={isMobileMenuOpen} closeMobile={() => setIsMobileMenuOpen(false)} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 flex items-center justify-between shrink-0 relative z-30 gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 lg:hidden"><Menu size={20} /></button>
            <h1 className="font-bold text-base md:text-xl hidden sm:block">The Hire Ground Podcast</h1>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-2xl">
            <form onSubmit={handleAiSearch} className="relative w-full flex items-center bg-white rounded-xl border border-gray-300 h-10 md:h-12 overflow-hidden group">
              <div className="pl-3 text-gray-400">{isAiSearching ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}</div>
              <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="Ask AI about episodes..." className="flex-1 px-3 outline-none text-sm bg-transparent" />
              {aiResultIds && <button type="button" onClick={clearAiSearch} className="px-3 border-l"><X size={16} /></button>}
              <button type="submit" className="bg-gray-50 px-4 text-sm font-medium border-l h-full">Search</button>
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {view === 'directory' && (
              <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden h-10">
                <button onClick={() => setViewMode('list')} className={`px-3 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><List size={18} /></button>
                <button onClick={() => setViewMode('gallery')} className={`px-3 ${viewMode === 'gallery' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Layout size={18} /></button>
                <button onClick={() => setViewMode('detailed')} className={`px-3 ${viewMode === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Grid size={18} /></button>
              </div>
            )}
            
            {isAdminMode ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setView('analytics')} className={`p-2 rounded-lg ${view === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><BarChart3 size={18} /></button>
                <button onClick={() => setView('tags')} className={`p-2 rounded-lg ${view === 'tags' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><Tags size={18} /></button>
                <button onClick={() => setView('docs')} className={`p-2 rounded-lg ${view === 'docs' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><BookOpen size={18} /></button>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 md:px-4 rounded-lg flex items-center gap-2"><Plus size={18} /><span className="hidden md:inline font-bold text-sm">Add</span></button>

                <div className="relative">
                  <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 text-gray-500"><Settings size={20} /></button>
                  {isSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-2 space-y-1">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">System</div>
                        <button onClick={() => { setShowPublishModal(true); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"><UploadCloud size={14} className="text-green-600" /> Publish Updates</button>
                        <button onClick={() => handleResetApp()} className="w-full text-left px-3 py-2 text-sm text-red-600 flex items-center gap-2 hover:bg-red-50"><RefreshCcw size={14} /> Factory Reset</button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Data</div>
                        <button onClick={() => downloadVideosAsJson()} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"><FileJson size={14} /> Backup JSON</button>
                        <button onClick={() => downloadLogsAsCsv()} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"><FileSpreadsheet size={14} /> Activity CSV</button>
                        <button onClick={() => { setIsAdminMode(false); setView('directory'); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-bold text-red-600 border-t mt-1">Logout</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 p-2 flex items-center gap-1.5"><Lock size={18} /><span className="text-xs font-bold uppercase">Admin</span></button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50">
          {view === 'directory' && (
            <div className="max-w-7xl mx-auto">
              <p className="text-xs text-gray-500 mb-4">Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes</p>
              <div className={`grid gap-4 md:gap-6 ${viewMode === 'list' ? 'grid-cols-1' : viewMode === 'gallery' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'}`}>
                {filteredVideos.map(v => <VideoCard key={v.id} video={v} isAdmin={isAdminMode} onEdit={() => { setEditingVideo(v); setIsModalOpen(true); }} viewMode={viewMode} />)}
              </div>
            </div>
          )}
          {view === 'analytics' && <AnalyticsDashboard />}
          {view === 'tags' && <TagManager videos={videos} onUpdate={handleVideoUpdate} />}
          {view === 'docs' && <Documentation />}
        </main>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Admin Login</h2>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus className="w-full border p-2.5 rounded-lg mb-4" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password..." />
              {passwordError && <p className="text-red-500 text-xs mb-3">Incorrect password.</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddVideoModal 
          isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingVideo(null); }}
          editVideo={editingVideo} existingVideos={videos}
          availableProfiles={allProfiles} availableTopics={allTopics} availableAudiences={allAudiences}
          onAdd={handleVideoAdd} onUpdate={handleVideoUpdate} onDelete={handleVideoDelete}
        />
      )}
    </div>
  );
};

export default App;