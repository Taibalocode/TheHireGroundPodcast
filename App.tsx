import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { AddVideoModal } from './components/AddVideoModal';
import { 
  Sparkles, Lock, Plus, List, Grid, Layout, Menu, X, Loader2, 
  BookOpen, BarChart3, Tags, Settings, FileJson, UploadCloud, 
  RefreshCcw, Database, FileSpreadsheet 
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoEntry | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [view, setView] = useState<'directory' | 'docs' | 'analytics' | 'tags'>('directory');
  
  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);

  // 1. APP INITIALIZATION (Sync Videos and Logs)
  useEffect(() => {
    const initApp = async () => {
      try {
        // Fetch videos from Firestore
        const fetched = await videoStorage.getAll();
        setVideos(fetched);

        // Sync Analytics logs from Firestore to LocalStorage
        await syncLogsWithCloud();
        
        // Initialize Logger (GeoIP)
        await initLoggerSession();
      } catch (e) { 
        console.error("App Init Failed:", e); 
      } finally { 
        setIsLoading(false); 
      }
    };
    initApp();
  }, []);

  // 2. ADMIN ACTIONS
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
      console.error("Login failed", error);
      setPasswordError(true); 
    }
  };

  const handleResetApp = async () => {
    if (window.confirm("⚠️ CLOUD FACTORY RESET ⚠️\n\nThis will permanently delete all videos in Firestore and restore the master catalog.\n\nYour Activity Logs will be preserved. Proceed?")) {
        try {
            await logEvent('ADMIN_FACTORY_RESET_START');
            await videoStorage.reset(); 
            
            // SECURITY FIX: Removed localStorage.clear() to preserve Activity Logs
            sessionStorage.clear();
            
            window.location.reload();
        } catch (e) {
            console.error("Firestore Reset failed", e);
            alert("Reset failed. Check console.");
        }
    }
  };

  // 3. SEARCH & FILTER LOGIC
  const handleAiSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiSearching(true);
    setFilterState(prev => ({ ...prev, searchQuery: '', aiSearchActive: false }));

    try {
        const ids = await searchVideosWithAI(aiQuery, videos);
        if (ids && ids.length > 0) {
            setAiResultIds(ids);
            setFilterState(prev => ({ ...prev, aiSearchActive: true }));
            await logEvent('AI_SEARCH_SUCCESS', `Prompt: "${aiQuery}" | Found: ${ids.length}`);
        } else {
            setAiResultIds([]);
            setFilterState(prev => ({ ...prev, aiSearchActive: true }));
            await logEvent('AI_SEARCH_EMPTY', `Prompt: "${aiQuery}"`);
        }
    } catch (err: any) {
        console.error("AI Search Error:", err);
        setAiResultIds([]);
        setFilterState(prev => ({ ...prev, aiSearchActive: true }));
    } finally {
        setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResultIds(null);
    setFilterState(prev => ({ ...prev, aiSearchActive: false, searchQuery: '' }));
  };

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

    return result.sort((a, b) => {
      const bTime = (typeof (b.publishedAt || b.createdAt) === 'number' ? (b.publishedAt || b.createdAt) : new Date(b.publishedAt || b.createdAt).getTime() || 0) as number;
      const aTime = (typeof (a.publishedAt || a.createdAt) === 'number' ? (a.publishedAt || a.createdAt) : new Date(a.publishedAt || a.createdAt).getTime() || 0) as number;
      return bTime - aTime;
    });
  }, [videos, filterState, aiResultIds]);

  // 4. DATA MANAGEMENT
  const handleVideoAdd = async (newVideo: Omit<VideoEntry, 'id' | 'createdAt'>) => {
      const completeVideo: VideoEntry = {
          ...newVideo,
          id: crypto.randomUUID(),
          createdAt: Date.now()
      };
      const updatedList = await videoStorage.add(completeVideo); 
      setVideos(updatedList);
      setIsModalOpen(false);
      await logEvent('VIDEO_ADDED', `Title: ${completeVideo.title}`);
  };

  const handleVideoUpdate = async (id: string, updates: Partial<VideoEntry>) => {
      const updatedList = await videoStorage.update(id, updates);
      setVideos(updatedList); 
      if (isModalOpen) {
          setIsModalOpen(false);
          setEditingVideo(null);
      }
      await logEvent('VIDEO_UPDATED', `ID: ${id}`);
  };

  const handleVideoDelete = async (id: string) => {
      if (window.confirm("Permanently delete this episode?")) {
          const updatedList = await videoStorage.delete(id);
          setVideos(updatedList);
          setIsModalOpen(false);
          setEditingVideo(null);
          await logEvent('VIDEO_DELETED', `ID: ${id}`);
      }
  };

  // Export Helpers
  const downloadVideosAsJson = () => {
    const blob = new Blob([JSON.stringify(videos, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `db_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-gray-500 font-medium">Loading Directory...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      
      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-20 shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <FilterSidebar 
          videos={videos}
          filterState={filterState}
          setFilterState={setFilterState}
          availableProfiles={Array.from(new Set(videos.flatMap(v => v.guestProfiles || []))).sort()}
          availableTopics={Array.from(new Set(videos.flatMap(v => v.topics || []))).sort()}
          isOpenMobile={isMobileMenuOpen}
          closeMobile={() => setIsMobileMenuOpen(false)} 
        />
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 flex items-center justify-between shrink-0 relative z-30 gap-3 md:gap-6">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden shrink-0">
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-base md:text-xl truncate hidden sm:block text-gray-900">The Hire Ground Podcast</h1>
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-center max-w-2xl">
            <form onSubmit={handleAiSearch} className="relative w-full flex items-center bg-white rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all overflow-hidden h-10 md:h-12 group">
              <div className="pl-3 text-gray-400 flex items-center justify-center shrink-0">
                {isAiSearching ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Sparkles className={aiResultIds ? "text-blue-600" : "text-gray-400"} size={18} />}
              </div>
              <input 
                type="text" 
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask AI about episodes..."
                className="flex-1 px-3 h-full outline-none text-sm text-gray-700 min-w-0 bg-transparent"
              />
              {aiResultIds && (
                <button type="button" onClick={clearAiSearch} className="px-3 h-full text-gray-400 hover:text-gray-600 border-l border-gray-100 bg-gray-50 shrink-0">
                  <X size={16} />
                </button>
              )}
              <button type="submit" disabled={isAiSearching || !aiQuery.trim()} className="bg-gray-50 h-full hover:bg-gray-100 border-l border-gray-200 px-4 text-gray-600 font-medium text-sm disabled:opacity-50 shrink-0">
                Search
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {view === 'directory' && (
              <div className="hidden sm:flex items-center bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm h-10">
                <button onClick={() => setViewMode('list')} className={`px-3 h-full ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><List size={18} /></button>
                <button onClick={() => setViewMode('gallery')} className={`px-3 h-full ${viewMode === 'gallery' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Layout size={18} /></button>
                <button onClick={() => setViewMode('detailed')} className={`px-3 h-full ${viewMode === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Grid size={18} /></button>
              </div>
            )}
            
            {isAdminMode ? (
              <div className="flex items-center gap-1 md:gap-2 relative">
                <button onClick={() => setView('analytics')} className={`p-2 rounded-lg ${view === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`} title="Analytics"><BarChart3 size={18} /></button>
                <button onClick={() => setView('tags')} className={`p-2 rounded-lg ${view === 'tags' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`} title="Tags"><Tags size={18} /></button>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 md:px-4 rounded-lg flex items-center gap-2"><Plus size={18} /><span className="hidden md:inline text-sm font-bold">Add</span></button>

                <div className="relative">
                  <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><Settings size={20} /></button>
                  {isSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                      <div className="p-2 space-y-1">
                        <button onClick={() => handleResetApp()} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"><RefreshCcw size={14} /> Factory Reset</button>
                        <button onClick={() => { downloadVideosAsJson(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FileJson size={14} /> Export JSON</button>
                        <button onClick={() => { downloadLogsAsCsv(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FileSpreadsheet size={14} /> Export Logs (CSV)</button>
                        <button onClick={() => { setIsAdminMode(false); setView('directory'); }} className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg font-bold border-t border-gray-100 mt-1">Logout</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 hover:text-gray-600 p-2 flex items-center gap-1.5"><Lock size={18} /><span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Admin</span></button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50 relative z-10">
          {view === 'directory' && (
            <div className="max-w-7xl mx-auto">
              <div className="mb-4 md:mb-6">
                 <p className="text-xs md:text-sm text-gray-500 font-medium">Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes</p>
              </div>
              <div className={`grid gap-4 md:gap-6 ${viewMode === 'list' ? 'grid-cols-1' : viewMode === 'gallery' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {filteredVideos.map(v => <VideoCard key={v.id} video={v} isAdmin={isAdminMode} onEdit={() => { setEditingVideo(v); setIsModalOpen(true); }} viewMode={viewMode} />)}
              </div>
            </div>
          )}
          {view === 'analytics' && <AnalyticsDashboard />}
          {view === 'tags' && <TagManager videos={videos} onUpdate={handleVideoUpdate} />}
          {view === 'docs' && <Documentation />}
        </main>
      </div>

      {/* LOGIN MODAL */}
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

      {/* VIDEO MODAL */}
      {isModalOpen && (
        <AddVideoModal 
          isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingVideo(null); } }
          editVideo={editingVideo} existingVideos={videos}
          availableProfiles={Array.from(new Set(videos.flatMap(v => v.guestProfiles || [])))}
          availableTopics={Array.from(new Set(videos.flatMap(v => v.topics || [])))}
          onAdd={handleVideoAdd} onUpdate={handleVideoUpdate} onDelete={handleVideoDelete} availableAudiences={[]}        />
      )}
    </div>
  );
};

export default App;