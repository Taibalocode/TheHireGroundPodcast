import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { AddVideoModal } from './components/AddVideoModal';
import { Sparkles, Lock, Plus, List, LayoutGrid, Grid, Layout, Menu, X, Loader2, BookOpen, BarChart3, Tags, Settings, Download, FileJson, UploadCloud, RefreshCcw, Database, FileSpreadsheet } from 'lucide-react';
import { searchVideosWithAI } from './services/geminiService';
import { logEvent, getLogs, initLoggerSession, downloadLogsAsCsv, downloadLogsAsJson } from './services/logger';
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
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
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
  const allAudiences = useMemo(() => Array.from(new Set(videos.flatMap(v => v.targetAudience || []))).sort(), [videos]);
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
const downloadVideosAsJson = () => {
    const blob = new Blob([JSON.stringify(videos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hire_ground_db_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };
  const cleanUpDuplicates = async () => {
    if (!window.confirm("Ready to hunt down and delete duplicate videos?")) return;
    
    setIsLoading(true);
    try {
        const allVideos = await videoStorage.getAll();
        const seenYoutubeIds = new Set();
        const duplicateDbIds: string[] = [];

        // 1. Find the duplicates
        for (const video of allVideos) {
            // We use youtubeId to check for duplicates, since those should be unique
            const identifier = video.youtubeId || video.title; 
            
            if (seenYoutubeIds.has(identifier)) {
                duplicateDbIds.push(video.id); // This is a copy! Mark for deletion.
            } else {
                seenYoutubeIds.add(identifier); // First time seeing this one, keep it.
            }
        }

        // 2. Delete them from Firestore
        console.log(`Found ${duplicateDbIds.length} duplicates. Deleting...`);
        for (const id of duplicateDbIds) {
            await videoStorage.delete(id);
        }

        alert(`Successfully deleted ${duplicateDbIds.length} duplicate videos!`);
        
        // 3. Refresh the page to load the clean data
        window.location.reload();
    } catch (error) {
        console.error("Failed to clean duplicates:", error);
        alert("Something went wrong. Check the console.");
        setIsLoading(false);
    }
  };
  const downloadVideosAsCsv = () => {
    if (videos.length === 0) return;
    const headers = [
      "YouTubeID", "Title", "Headline", "FullDescription", "GuestName", 
      "GuestProfiles", "TargetAudience", "Topics", "Transcript", "PublishedDate", "IsShort", "SpotifyUrl"
    ];
    const rows = videos.map(v => [
      v.youtubeId,
      `"${(v.title || '').replace(/"/g, '""')}"`,
      `"${(v.headline || '').replace(/"/g, '""')}"`,
      `"${(v.fullDescription || '').replace(/"/g, '""')}"`,
      `"${(v.guestName || '').replace(/"/g, '""')}"`,
      `"${v.guestProfiles.join(', ')}"`,
      `"${(v.targetAudience || []).join(', ')}"`,
      `"${v.topics.join(', ')}"`,
      `"${(v.transcript || '').replace(/"/g, '""')}"`,
      v.publishedAt || '',
      v.isShort || 'N',
      v.spotifyUrl || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `hire_ground_videos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleResetApp = async () => {
    if (window.confirm("⚠️ CLOUD FACTORY RESET ⚠️\n\nThis will permanently delete all documents in your Firestore database and restore the master catalog.\n\nAre you absolutely sure?")) {
        try {
            logEvent('ADMIN_FACTORY_RESET_START');
            
            // 1. Tell the storage service to wipe Firestore and re-seed
            await videoStorage.reset(); 
            
            // 2. Clear local cache just in case
            localStorage.clear();
            sessionStorage.clear();
            
            // 3. Reload the page to fetch the fresh database
            const reloadUrl = window.location.origin + window.location.pathname + '?reset=' + Date.now();
            window.location.replace(reloadUrl);
        } catch (e) {
            console.error("Firestore Reset failed", e);
            alert("Failed to reset the database. Check console for Firebase errors.");
        }
    }
  };
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
}; const handleVideoAdd = async (newVideo: Omit<VideoEntry, 'id' | 'createdAt'>) => {
      // 1. Give the new video a unique ID and timestamp
      const completeVideo: VideoEntry = {
          ...newVideo,
          id: crypto.randomUUID(),
          createdAt: Date.now()
      };
      
      // 2. Save to Firestore and get the fresh list back
      const updatedList = await videoStorage.add(completeVideo); 
      
      // 3. Update the screen and close modal
      setVideos(updatedList);
      setIsModalOpen(false);
  };

  const handleVideoUpdate = async (id: string, updates: Partial<VideoEntry>) => {
      const updatedList = await videoStorage.update(id, updates);
      setVideos(updatedList); 
      if (isModalOpen) {
          setIsModalOpen(false);
          setEditingVideo(null);
      }
  };

  const handleVideoDelete = async (id: string) => {
      if (window.confirm("Are you sure you want to permanently delete this episode?")) {
          const updatedList = await videoStorage.delete(id);
          setVideos(updatedList);
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
     {/* View Mode Selectors */}
{view === 'directory' && (
   <div className="hidden sm:flex items-center bg-white p-0.5 rounded-lg border border-gray-200 overflow-hidden shadow-sm h-10">
       <button 
           onClick={() => setViewMode('list')} 
           className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
           title="List View"
       >
           <List size={18} />
       </button>
       <button 
           onClick={() => setViewMode('gallery')} 
           className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'gallery' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
           title="Gallery View"
       >
           <Layout size={18} />
       </button>
       <button 
           onClick={() => setViewMode('detailed')} 
           className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'detailed' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
           title="Detailed View"
       >
           <Grid size={18} />
       </button>
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

    {/* Settings Dropdown */}
<div className="relative flex items-center h-10">
    <button 
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors ${isSettingsOpen ? 'bg-gray-100 text-blue-600' : ''}`}
    >
        <Settings size={20} />
    </button>
    
    {isSettingsOpen && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-slideDown origin-top-right">
                <div className="p-2 space-y-1">
                    
                    {/* System Section */}
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>
                    <button onClick={() => { setShowPublishModal(true); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                        <UploadCloud size={14} className="text-green-600" /> Publish Updates
                    </button>
                    <button onClick={() => { handleResetApp(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                        <RefreshCcw size={14} className="text-red-600" /> Factory Reset
                    </button>
                    
                    <div className="h-px bg-gray-100 my-1"></div>
                    
                    {/* Data Export Section */}
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Data Export</div>
                    <button onClick={() => { downloadVideosAsCsv(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                        <Database size={14} className="text-blue-600" /> Export Videos (CSV)
                    </button>
                    <button onClick={() => { downloadVideosAsJson(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                        <FileJson size={14} className="text-indigo-600" /> Backup Database (JSON)
                    </button>
                    
                    <div className="h-px bg-gray-100 my-1"></div>
                    
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>

{/* ADD THIS TEMPORARY BUTTON */}
<button onClick={() => { cleanUpDuplicates(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2 font-bold">
    🧹 Run Magic Eraser
</button>

<button onClick={() => { setShowPublishModal(true); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"><UploadCloud size={14} className="text-green-600" /> Publish Updates</button>
                    {/* Logs Section */}
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Logs</div>
                    <button onClick={() => { downloadLogsAsCsv(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-emerald-600" /> Activity Logs (CSV)
                    </button>
                    <button onClick={() => { downloadLogsAsJson(); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                        <FileJson size={14} className="text-amber-600" /> Save Logs (logFile.json)
                    </button>

                    <div className="h-px bg-gray-100 my-1"></div>
                    
                    {/* Exit Admin */}
                    <button onClick={() => { setIsAdminMode(false); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors">
                        Exit Admin
                    </button>
                </div>
            </div>
        </>
    )}
</div>
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
    <div className={`grid gap-4 md:gap-6 ${
        viewMode === 'list' ? 'grid-cols-1' : 
        viewMode === 'gallery' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    }`}>
        {filteredVideos.map(video => (
            <VideoCard 
                key={video.id} 
                video={video} 
                isAdmin={isAdminMode} 
                onEdit={() => { setEditingVideo(video); setIsModalOpen(true); }}
                viewMode={viewMode}
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
          availableProfiles={allProfiles}
          availableTopics={allTopics}
          availableAudiences={allAudiences}
          // THE FIX: We intercept 'v' and add the missing ID and Timestamp
          onAdd={async (v) => { 
            const completeVideo = {
              ...v,
              id: crypto.randomUUID(),
              createdAt: Date.now()
            } as VideoEntry;
            
            // videoStorage.add now automatically returns the fresh list!
            const updated = await videoStorage.add(completeVideo); 
            setVideos(updated); 
            setIsModalOpen(false); 
          }}
          onUpdate={handleVideoUpdate}
          onDelete={handleVideoDelete}
        />
      )}
  </div>
);
};

export default App;