import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { Lock, Plus, List, LayoutGrid, Grid, Menu, Sparkles } from 'lucide-react';
import { AddVideoModal } from './components/AddVideoModal';
import { logEvent } from './services/logger';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoEntry | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const fetched = await videoStorage.getAll();
        setVideos(fetched);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchVideos();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setShowPasswordModal(false);
      setPasswordError(false);
    } else { setPasswordError(true); }
  };

  const allProfiles = useMemo(() => Array.from(new Set(videos.flatMap(v => v.guestProfiles || []))).sort(), [videos]);
  const allTopics = useMemo(() => Array.from(new Set(videos.flatMap(v => v.topics || []))).sort(), [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = !filterState.searchQuery || 
        video.title.toLowerCase().includes(filterState.searchQuery.toLowerCase());

      const matchesProfiles = filterState.selectedProfiles.length === 0 || 
        filterState.selectedProfiles.every(p => video.guestProfiles?.includes(p));

      const matchesTopics = filterState.selectedTopics.length === 0 || 
        filterState.selectedTopics.every(t => video.topics?.includes(t));

      // FIXED: Added check for 'videos' (Full Episodes)
      const matchesShorts = filterState.shortsFilter === 'all' || 
        (filterState.shortsFilter === 'shorts' && video.isShort === 'Y') ||
        (filterState.shortsFilter === 'videos' && video.isShort !== 'Y');

      return matchesSearch && matchesProfiles && matchesTopics && matchesShorts;
    });
  }, [videos, filterState]);

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  const handleAISearch = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  
  if (!filterState.searchQuery.trim()) return;

  setIsLoading(true); // Show a loading state while AI thinks
  try {
    // This calls your existing Gemini service to find semantic matches
    const aiResults = await videoStorage.searchWithAI(filterState.searchQuery);
    setVideos(aiResults);
    logEvent('AI_SEARCH_SUCCESS', `Query: ${filterState.searchQuery}`);
  } catch (err) {
    console.error("AI Search failed, falling back to local filter", err);
  } finally {
    setIsLoading(false);
  }
};
  return (
  <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
    
    {/* 1. RESPONSIVE SIDEBAR */}
    <div className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:z-20 shrink-0
      ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <FilterSidebar 
        videos={videos}
        filterState={filterState}
        setFilterState={setFilterState}
        availableProfiles={allProfiles}
        availableTopics={allTopics} 
        isOpenMobile={isMobileMenuOpen}
        closeMobile={() => setIsMobileMenuOpen(false)} 
      />
    </div>

    {/* Mobile Backdrop */}
    {isMobileMenuOpen && (
      <div 
        className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" 
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}

    {/* 2. MAIN CONTENT AREA */}
    <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
      
      {/* HEADER: Updated with min-w-0 and adjusted spacing for mobile density */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between shrink-0 relative z-30">
  {/* Left: Title & Mobile Menu */}
  <div className="flex items-center gap-3">
    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-500 lg:hidden">
      <Menu size={20} />
    </button>
    <h1 className="font-bold text-lg md:text-xl text-gray-800 shrink-0">The Hire Ground Podcast</h1>
  </div>

  {/* Center: The Centered Search Bar (Hidden on very small screens) */}
  <div className="hidden md:flex flex-1 max-w-2xl mx-12">
  <form onSubmit={handleAISearch} className="relative w-full group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
      <Sparkles size={18} className="text-blue-500 animate-pulse" />
    </div>
    <input 
      type="text" 
      placeholder="Ask AI about episodes..." 
      value={filterState.searchQuery}
      onChange={(e) => setFilterState(prev => ({...prev, searchQuery: e.target.value}))}
      className="w-full pl-12 pr-24 py-3 bg-white rounded-xl border border-gray-200 shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
    />
    <button 
      type="submit"
      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
    >
      Search
    </button>
  </form>
</div>
  
  {/* Right: Actions */}
  <div className="flex items-center gap-4 shrink-0">
    <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
       {/* ... your existing viewMode toggle buttons ... */}
    </div>
    
    {isAdminMode ? (
      <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 md:px-4 rounded-lg flex items-center gap-2">
        <Plus size={18} />
      </button>
    ) : (
      <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 flex items-center gap-2 hover:text-gray-600 uppercase text-[10px] font-bold tracking-widest">
        <Lock size={14} /> Admin Login
      </button>
    )}
  </div>
</header>

      {/* VIDEO FEED: High-density grid settings */}
      <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6">
             <p className="text-xs md:text-sm text-gray-500 font-medium">
               Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes
             </p>
          </div>

          <div className={`grid gap-2 md:gap-4 ${
            viewMode === 'list' ? 'grid-cols-1' : 
            viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4' : 
            'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
          }`}>
            {filteredVideos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                isAdmin={isAdminMode} 
                viewMode={viewMode}
                onEdit={() => { setEditingVideo(video); setIsModalOpen(true); }} 
              />
            ))}
          </div>
        </div>
      </main>
    </div>

    {/* MODALS */}
    {showPasswordModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
          <h2 className="text-lg font-bold mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input 
              type="password" 
              autoFocus
              className="w-full border border-gray-200 p-2.5 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
            />
            {passwordError && <p className="text-red-500 text-xs mb-3">Incorrect password.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-500 text-sm font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">Login</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {isModalOpen && (
      <AddVideoModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingVideo(null); }}
        editVideo={editingVideo}
        onAdd={async (v) => { await videoStorage.add(v); const updated = await videoStorage.getAll(); setVideos(updated); setIsModalOpen(false); }}
        onUpdate={async (id, v) => { await videoStorage.update(id, v); const updated = await videoStorage.getAll(); setVideos(updated); setIsModalOpen(false); setEditingVideo(null); }}
        onDelete={async (id) => { if(window.confirm('Delete?')){ await videoStorage.delete(id); const updated = await videoStorage.getAll(); setVideos(updated); setIsModalOpen(false); setEditingVideo(null); }}}
        availableProfiles={allProfiles}
        availableTopics={allTopics}
        availableAudiences={[]}
      />
    )}
  </div>
);
};

export default App;