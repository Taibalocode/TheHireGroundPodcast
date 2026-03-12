import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { AddVideoModal } from './components/AddVideoModal';
import { logEvent } from './services/logger';
import { Sparkles, Lock, Plus, List, LayoutGrid, Grid, Menu, X, Loader2, BookOpen, BarChart3, Tags, Settings, Download, FileJson, UploadCloud, RefreshCcw, FileSpreadsheet } from 'lucide-react';
import { searchVideosWithAI } from './services/geminiService';
import { Documentation } from './components/Documentation';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TagManager } from './components/TagManager';

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
 const handleAiSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiSearching(true);
    // CLEAR any text filters so we ONLY rely on AI
    setFilterState(prev => ({ ...prev, searchQuery: '', aiSearchActive: false }));

    try {
        console.log("Sending to Gemini:", aiQuery);
        const ids = await searchVideosWithAI(aiQuery, videos);
        
        if (ids && ids.length > 0) {
            setAiResultIds(ids);
            setFilterState(prev => ({ ...prev, aiSearchActive: true }));
        } else {
            alert("AI couldn't find matches. Try rephrasing!");
            setAiResultIds([]); // Show zero results
            setFilterState(prev => ({ ...prev, aiSearchActive: true }));
        }
    } catch (err: any) {
        console.error("AI Search CRASHED:", err);
        alert(`AI Error: ${err.message || 'Check console'}. Are you sure your API key is valid?`);
        setAiResultIds([]); // Force zero results so we know it broke
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
  // 1. Start with all videos
  let result = videos;

  // 2. Apply AI Search OR Text Search
  if (filterState.aiSearchActive && aiResultIds) {
    result = result.filter(v => aiResultIds.includes(v.id));
  } else if (filterState.searchQuery) {
    const q = filterState.searchQuery.toLowerCase();
    result = result.filter(v => 
      v.title.toLowerCase().includes(q) || 
      (v.guestName && v.guestName.toLowerCase().includes(q)) ||
      (v.topics && v.topics.some(t => t.toLowerCase().includes(q)))
    );
  }

  // 3. Apply Profile Filters
  if (filterState.selectedProfiles.length > 0) {
    result = result.filter(v => 
      filterState.selectedProfiles.every(p => v.guestProfiles?.includes(p))
    );
  }

  // 4. Apply Topic Filters
  if (filterState.selectedTopics.length > 0) {
    result = result.filter(v => 
      filterState.selectedTopics.every(t => v.topics?.includes(t))
    );
  }

  // 5. Apply Shorts / Full Episodes Filter
  if (filterState.shortsFilter === 'shorts') {
    result = result.filter(v => v.isShort === 'Y');
  } else if (filterState.shortsFilter === 'videos') {
    result = result.filter(v => v.isShort !== 'Y');
  }

  // 6. Optional but recommended: Sort by newest first
  return result.sort((a, b) => {
    const dateA = new Date(a.publishedAt || a.createdAt).getTime();
    const dateB = new Date(b.publishedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

}, [videos, filterState, aiResultIds]);

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
}; const handleVideoUpdate = async (id: string, updates: Partial<VideoEntry>) => {
  // Uses your async storage method to update the DB
  await videoStorage.update(id, updates);
  const updated = await videoStorage.getAll();
  setVideos(updated); // Refreshes the UI instantly
  
  if (isModalOpen) {
    setIsModalOpen(false);
    setEditingVideo(null);
  }
};
  function setShowSettingsMenu(arg0: boolean): void {
    throw new Error('Function not implemented.');
  }
  
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
      <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 flex items-center justify-between shrink-0 relative z-30 gap-3 md:gap-6">
  
  {/* 1. LEFT: Brand & Mobile Menu */}
  <div className="flex items-center gap-2 min-w-0 shrink-0">
    <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden shrink-0">
      <Menu size={20} />
    </button>
    <h1 className="font-bold text-base md:text-xl truncate hidden sm:block text-gray-900">The Hire Ground Podcast</h1>
  </div>

  {/* 2. CENTER: AI Search Bar */}
  <div className="flex-1 flex items-center justify-center max-w-2xl">
    <form onSubmit={handleAiSearch} className="relative w-full flex items-center bg-white rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all overflow-hidden h-10 md:h-12 group">
        <div className="pl-3 text-gray-400 flex items-center justify-center shrink-0">
            {isAiSearching ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Sparkles className={`transition-colors ${aiResultIds ? "text-blue-600" : "text-gray-400 group-hover:text-blue-400"}`} size={18} />}
        </div>
        <input 
    type="text" 
    value={aiQuery}
    onChange={(e) => {
        const val = e.target.value;
        setAiQuery(val);
        // Instantly run standard text search as the user types
        setFilterState(prev => ({ ...prev, searchQuery: val, aiSearchActive: false }));
        setAiResultIds(null); // Clear previous AI results when they type something new
    }}
    placeholder="Ask AI about episodes..."
    className="flex-1 px-3 h-full outline-none text-sm text-gray-700 placeholder-gray-400 min-w-0 bg-transparent"
/>
        {aiResultIds && (
            <button type="button" onClick={clearAiSearch} className="px-3 h-full text-gray-400 hover:text-gray-600 border-l border-gray-100 flex items-center justify-center bg-gray-50 transition-colors">
                <X size={16} />
            </button>
        )}
        <button type="submit" disabled={isAiSearching || !aiQuery.trim()} className="bg-gray-50 h-full hover:bg-gray-100 border-l border-gray-200 px-4 text-gray-600 font-medium text-sm transition-colors whitespace-nowrap disabled:opacity-50">
            Search
        </button>
    </form>
  </div>

  {/* 3. RIGHT: Actions (View Toggles & Admin) */}
  <div className="flex items-center gap-3 shrink-0">
     {/* Standard Layout Toggles (Hidden on very small screens to make room for search) */}
     {view === 'directory' && (
        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          {(['list', 'grid', 'expanded'] as ViewMode[]).map((mode) => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              {mode === 'list' && <List size={16} />}
              {mode === 'grid' && <LayoutGrid size={16} />}
              {mode === 'expanded' && <Grid size={16} />}
            </button>
          ))}
        </div>
     )}
     
     {/* Admin Controls */}
{isAdminMode ? (
  <div className="flex items-center gap-1 md:gap-2 relative">
    {/* Dashboard Tabs */}
    <button onClick={() => setView('analytics')} className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 hidden lg:block transition-colors ${view === 'analytics' ? 'bg-blue-50 text-blue-600' : ''}`}><BarChart3 size={18} /></button>
    <button onClick={() => setView('tags')} className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 hidden lg:block transition-colors ${view === 'tags' ? 'bg-blue-50 text-blue-600' : ''}`}><Tags size={18} /></button>
    <button onClick={() => setView('docs')} className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 hidden lg:block transition-colors ${view === 'docs' ? 'bg-blue-50 text-blue-600' : ''}`}><BookOpen size={18} /></button>
    
    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95">
      <Plus size={18} /> <span className="hidden md:inline text-sm font-bold">Add</span>
    </button>

    {/* NEW: Settings Menu Toggle */}
    <button 
      onClick={() => setShowSettingsMenu(!setShowSettingsMenu)} 
      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ml-1"
    >
      <Settings size={20} />
    </button>

    {/* NEW: Settings Dropdown Box */}
    {setShowSettingsMenu && (
  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
    
    {/* Data Management Section */}
    <div className="px-4 py-2 border-b border-gray-50 mb-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data Management</p>
    </div>
    
    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
      <FileSpreadsheet size={16} className="text-gray-400" /> Export to CSV
    </button>
    
    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
      <FileJson size={16} className="text-gray-400" /> JSON Backup
    </button>
    
    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
      <BarChart3 size={16} className="text-gray-400" /> Export Activity Logs
    </button>
    
    {/* System Actions Section */}
    <div className="px-4 py-2 border-b border-gray-50 mb-1 mt-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Actions</p>
    </div>
    
    <button className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors font-medium">
      <UploadCloud size={16} /> Publish seedData.ts
    </button>
    
    <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium">
      <RefreshCcw size={16} /> Factory Reset
    </button>
    
  </div>
)}
  </div>
) : (
  <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 hover:text-gray-600 p-2 flex items-center gap-1.5 transition-colors">
    <Lock size={18} /> <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Admin</span>
  </button>
)}
  </div>
</header>

      {/* VIDEO FEED: High-density grid settings */}
      <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50 relative z-10">
  {/* VIEW 1: THE PUBLIC DIRECTORY */}
  {view === 'directory' && (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
         <p className="text-xs md:text-sm text-gray-500 font-medium">
           Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes
           {filterState.aiSearchActive && <span className="ml-2 text-blue-600 font-medium">(AI Filter Active)</span>}
         </p>
      </div>

      {filteredVideos.length > 0 ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-1">No episodes found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your filters or search query.</p>
            {aiQuery && <button onClick={clearAiSearch} className="mt-4 text-blue-600 font-medium hover:underline">Clear Search</button>}
        </div>
      )}
    </div>
  )}

  {/* VIEW 2: ANALYTICS DASHBOARD */}
  {view === 'analytics' && <AnalyticsDashboard />}

  {/* VIEW 3: TAG MANAGER */}
  {view === 'tags' && <TagManager videos={videos} onUpdate={handleVideoUpdate} />}

  {/* VIEW 4: SYSTEM DOCUMENTATION */}
  {view === 'docs' && <Documentation />}
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
    onAdd={async (v) => { 
      await videoStorage.add(v); 
      const updated = await videoStorage.getAll(); 
      setVideos(updated); 
      setIsModalOpen(false); 
    }}
    onUpdate={handleVideoUpdate} // <-- Now using our centralized helper
    onDelete={async (id) => { 
      if(window.confirm('Delete?')){ 
        await videoStorage.delete(id); 
        const updated = await videoStorage.getAll(); 
        setVideos(updated); 
        setIsModalOpen(false); 
        setEditingVideo(null); 
      }
    }}
    availableProfiles={allProfiles}
    availableTopics={allTopics}
    availableAudiences={[]}
  />
)}
  </div>
);
};

export default App;