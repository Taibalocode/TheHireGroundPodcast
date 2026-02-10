
import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { AddVideoModal } from './components/AddVideoModal';
import { Documentation } from './components/Documentation';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TagManager } from './components/TagManager';
import { logEvent, getLogs, initLoggerSession, downloadLogsAsCsv, downloadLogsAsJson } from './services/logger';
import { videoStorage } from './services/storage';
import { searchVideosWithAI } from './services/geminiService';
import { APP_VERSION } from './constants';
import { 
  Menu, 
  Download, 
  Settings, 
  Sparkles, 
  X, 
  UploadCloud, 
  Plus,
  Loader2,
  BookOpen,
  RefreshCcw,
  Layout,
  FileSpreadsheet,
  Search,
  Cloud,
  CloudOff,
  ShieldCheck,
  Lock,
  Key,
  FileJson,
  BarChart3,
  List,
  Grid,
  Tags,
  Database
} from 'lucide-react';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local'>('syncing');
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [view, setView] = useState<'directory' | 'docs' | 'analytics' | 'tags'>('directory');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); 
  
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '',
    selectedProfiles: [],
    selectedTopics: [],
    aiSearchActive: false,
    shortsFilter: 'all'
  });

  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoEntry | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (!isAdminMode && (view === 'docs' || view === 'analytics' || view === 'tags')) setView('directory');
  }, [isAdminMode, view]);

  useEffect(() => {
    initLoggerSession();
    performCloudSync();
  }, []);

  const performCloudSync = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    setSyncError(null);
    logEvent('CLOUD_SYNC_START');
    
    try {
      const { videos: fetchedVideos, source } = await videoStorage.syncWithCloud();
      setVideos(fetchedVideos);
      setSyncStatus(source === 'cloud' ? 'synced' : 'local');
      logEvent('CLOUD_SYNC_SUCCESS', `Loaded ${fetchedVideos.length} videos from ${source}`);
    } catch (e) {
      console.error("Sync failed:", e);
      setSyncError("Failed to load data.");
      setSyncStatus('local');
      setVideos(videoStorage.getAll()); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const allProfiles = useMemo(() => Array.from(new Set(videos.flatMap(v => v.guestProfiles))).sort(), [videos]);
  const allTopics = useMemo(() => Array.from(new Set(videos.flatMap(v => v.topics))).sort(), [videos]);
  const allAudiences = useMemo(() => Array.from(new Set(videos.flatMap(v => v.targetAudience || []))).sort(), [videos]);

  const filteredVideos = useMemo(() => {
    let result = videos;

    if (filterState.aiSearchActive && aiResultIds) {
      result = result.filter(v => aiResultIds.includes(v.id));
    } else if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.guestName?.toLowerCase().includes(q) ||
        v.topics.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterState.selectedProfiles.length > 0) {
      result = result.filter(v => v.guestProfiles.some(p => filterState.selectedProfiles.includes(p)));
    }
    if (filterState.selectedTopics.length > 0) {
      result = result.filter(v => v.topics.some(t => filterState.selectedTopics.includes(t)));
    }

    if (filterState.shortsFilter === 'shorts') {
        result = result.filter(v => v.isShort === 'Y');
    } else if (filterState.shortsFilter === 'videos') {
        result = result.filter(v => v.isShort !== 'Y');
    }

    return result.sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.createdAt).getTime();
        const dateB = new Date(b.publishedAt || b.createdAt).getTime();
        return dateB - dateA;
    });
  }, [videos, filterState, aiResultIds]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdminMode(true);
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordError(false);
        logEvent('ADMIN_LOGIN_SUCCESS');
    } else {
        setPasswordError(true);
        logEvent('ADMIN_LOGIN_FAILURE');
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiSearching(true);
    setFilterState(prev => ({ ...prev, aiSearchActive: true, searchQuery: aiQuery }));
    logEvent('AI_SEARCH_QUERY', `Prompt: "${aiQuery}"`);

    try {
        const ids = await searchVideosWithAI(aiQuery, videos);
        setAiResultIds(ids);
        logEvent('AI_SEARCH_COMPLETE', `Found ${ids.length} matches`);
    } catch (err) {
        console.error(err);
    } finally {
        setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResultIds(null);
    setFilterState(prev => ({ ...prev, aiSearchActive: false, searchQuery: '' }));
  };

  const handlePublish = () => {
    const content = `
// This file replaces VideoSeed.json to ensure strict bundling without import errors.
// Note: Activity logs are now stored separately in logFile.json exports.
export const MASTER_SEED_DATA = {
  "videos": ${JSON.stringify(videos, null, 2)},
  "backupDate": "${new Date().toISOString()}",
  "version": "${APP_VERSION}"
}`;
    
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seedData.ts';
    link.click();
    setShowPublishModal(false);
    setIsSettingsOpen(false);
    logEvent('ADMIN_PUBLISH_DOWNLOAD');
  };

  const downloadVideosAsJson = () => {
    const blob = new Blob([JSON.stringify(videos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hire_ground_db_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    setIsSettingsOpen(false);
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
      `"${v.targetAudience.join(', ')}"`,
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
    setIsSettingsOpen(false);
  };

  const handleVideoAdd = (newVideo: Omit<VideoEntry, 'id' | 'createdAt'>) => {
      const v: VideoEntry = {
          ...newVideo,
          id: crypto.randomUUID(),
          createdAt: Date.now()
      };
      const updated = videoStorage.add(v);
      setVideos(updated);
      setIsModalOpen(false);
  };

  const handleVideoUpdate = (id: string, updates: Partial<VideoEntry>) => {
      const updated = videoStorage.update(id, updates);
      setVideos([...updated]); // Create new array ref to ensure children (TagManager) see update
      if (isModalOpen) {
          setIsModalOpen(false);
          setEditingVideo(null);
      }
  };

  const handleVideoDelete = (id: string) => {
      const updated = videoStorage.delete(id);
      setVideos([...updated]);
      setIsModalOpen(false);
      setEditingVideo(null);
  };

  const handleResetApp = () => {
    setIsSettingsOpen(false);
    
    // Explicit browser prompt
    if (window.confirm("⚠️ FACTORY RESET ⚠️\n\nThis will permanently delete all local changes and restore the master catalog from seedData.ts.\n\nAre you sure?")) {
        try {
            logEvent('ADMIN_FACTORY_RESET_START');
            videoStorage.reset();
            // Force browser to reload without cache
            const reloadUrl = window.location.origin + window.location.pathname + '?reset=' + Date.now();
            window.location.replace(reloadUrl);
        } catch (e) {
            console.error("Reset failed", e);
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    }
  };

  if (isLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
              <p className="font-medium">Loading content...</p>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shadow-xl z-20 shrink-0">
         <FilterSidebar 
            videos={videos}
            filterState={filterState}
            setFilterState={setFilterState}
            availableProfiles={allProfiles}
            availableTopics={allTopics}
            isOpenMobile={false}
            closeMobile={() => {}}
         />
      </div>

      {/* Mobile Sidebar Wrapper */}
      <div className={`lg:hidden fixed inset-0 z-50 pointer-events-none ${isMobileMenuOpen ? 'pointer-events-auto' : ''}`}>
        {isMobileMenuOpen && (
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        )}
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

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Main Header - Enforce vertical centering on all children */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between shrink-0 z-30 relative gap-4 min-h-[72px]">
            
            {/* Left: Mobile Toggle & Brand Section */}
            <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-900 p-1 flex items-center justify-center">
                    <Menu size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-lg lg:text-xl text-gray-800 whitespace-nowrap leading-none flex items-center gap-2">
                      The Hire Ground Podcast
                    </h1>
                </div>
            </div>

            {/* Center Area: AI Search - Perfectly centered and aligned */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-xl relative">
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg blur opacity-10 transition-opacity ${isAiSearching ? 'opacity-30' : ''}`}></div>
                    <form onSubmit={handleAiSearch} className="relative w-full flex items-center bg-white rounded-lg border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all overflow-hidden z-10 h-10">
                        <div className="pl-3 text-gray-400 flex items-center justify-center shrink-0">
                            {isAiSearching ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Sparkles className={aiResultIds ? "text-blue-600" : "text-gray-400"} size={18} />}
                        </div>
                        <input 
                            type="text" 
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            placeholder="Ask AI about episodes..."
                            className="flex-1 px-3 h-full outline-none text-sm text-gray-700 placeholder-gray-400 min-w-0"
                        />
                        {aiResultIds && (
                            <button type="button" onClick={clearAiSearch} className="px-3 h-full text-gray-400 hover:text-gray-600 border-l border-gray-100 flex items-center justify-center">
                                <X size={16} />
                            </button>
                        )}
                        <button type="submit" disabled={isAiSearching || !aiQuery.trim()} className="bg-gray-50 h-full hover:bg-gray-100 border-l border-gray-200 px-4 text-gray-600 font-medium text-sm transition-colors whitespace-nowrap flex items-center justify-center">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Area: View Selector + Admin Section - All aligned */}
            <div className="flex items-center gap-4 shrink-0">
                 {/* View Mode Selectors */}
                 {view === 'directory' && (
                    <div className="hidden sm:flex items-center bg-white p-0.5 rounded-lg border border-black overflow-hidden shadow-sm h-10">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-amber-400 text-black font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('gallery')} 
                            className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'gallery' ? 'bg-amber-400 text-black font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
                            title="Gallery View"
                        >
                            <Layout size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('detailed')} 
                            className={`px-3 h-full flex items-center justify-center transition-all ${viewMode === 'detailed' ? 'bg-amber-400 text-black font-bold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
                            title="Detailed View"
                        >
                            <Grid size={18} />
                        </button>
                    </div>
                )}

                 {/* Admin Controls Area */}
                 <div className="flex items-center gap-2">
                    {isAdminMode ? (
                         <div className="flex items-center gap-2">
                            <button onClick={() => setView('analytics')} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors ${view === 'analytics' ? 'text-blue-600 bg-blue-50' : ''}`} title="Analytics">
                                <BarChart3 size={20} />
                            </button>
                            <button onClick={() => setView('tags')} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors ${view === 'tags' ? 'text-blue-600 bg-blue-50' : ''}`} title="Tag Manager">
                                <Tags size={20} />
                            </button>
                            <button onClick={() => setView('docs')} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors ${view === 'docs' ? 'text-blue-600 bg-blue-50' : ''}`} title="Documentation">
                                <BookOpen size={20} />
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap">
                                 <Plus size={18} /> <span className="hidden md:inline">Add Video</span>
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
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-slideDown origin-top-right">
                                            <div className="p-2 space-y-1">
                                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>
                                                <button onClick={() => setShowPublishModal(true)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                                    <UploadCloud size={14} className="text-green-600" /> Publish Updates
                                                </button>
                                                <button onClick={handleResetApp} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                                    <RefreshCcw size={14} className="text-red-600" /> Factory Reset
                                                </button>
                                                
                                                <div className="h-px bg-gray-100 my-1"></div>
                                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Data Export</div>
                                                
                                                <button onClick={downloadVideosAsCsv} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                                    <Database size={14} className="text-blue-600" /> Export Videos (CSV)
                                                </button>
                                                <button onClick={downloadVideosAsJson} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                                    <FileJson size={14} className="text-indigo-600" /> Backup Database (JSON)
                                                </button>
                                                
                                                <div className="h-px bg-gray-100 my-1"></div>
                                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Logs</div>
                                                
                                                <button onClick={downloadLogsAsCsv} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                                    <FileSpreadsheet size={14} className="text-emerald-600" /> Activity Logs (CSV)
                                                </button>
                                                <button onClick={downloadLogsAsJson} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                                                    <FileJson size={14} className="text-amber-600" /> Save Logs (logFile.json)
                                                </button>

                                                <div className="h-px bg-gray-100 my-1"></div>
                                                <button onClick={() => { setIsAdminMode(false); setIsSettingsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium">
                                                    Exit Admin
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                         </div>
                    ) : (
                         <button onClick={() => setShowPasswordModal(true)} className="h-10 px-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest border border-transparent hover:border-gray-200 rounded-lg">
                            <Lock size={12} /> Admin Login
                         </button>
                    )}
                 </div>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth relative z-0">
            {view === 'directory' && (
                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6 text-xs text-gray-400">
                        <div>
                             Showing {filteredVideos.length} episodes
                             {filterState.aiSearchActive && <span className="ml-2 text-blue-600 font-medium">(AI Filter Active)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {syncStatus === 'synced' ? <Cloud size={12} className="text-green-500" /> : <CloudOff size={12} className="text-amber-500" />}
                            <span>v{APP_VERSION}</span>
                        </div>
                    </div>

                    {filteredVideos.length > 0 ? (
                        <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : viewMode === 'gallery' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
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
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <Search size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No episodes found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
                            {aiQuery && <button onClick={clearAiSearch} className="mt-4 text-blue-600 font-medium hover:underline">Clear Search</button>}
                        </div>
                    )}
                </div>
            )}

            {view === 'docs' && <Documentation />}
            
            {view === 'analytics' && <AnalyticsDashboard />}

            {view === 'tags' && <TagManager videos={videos} onUpdate={handleVideoUpdate} />}
        </div>
      </div>

      <AddVideoModal 
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setEditingVideo(null); }}
         onAdd={handleVideoAdd}
         onUpdate={handleVideoUpdate}
         onDelete={handleVideoDelete}
         editVideo={editingVideo}
         availableProfiles={allProfiles}
         availableTopics={allTopics}
         availableAudiences={allAudiences}
      />

      {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPasswordModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <ShieldCheck size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Admin Access</h3>
                      <p className="text-sm text-gray-500">Enter password to manage content.</p>
                  </div>
                  <form onSubmit={handleAdminLogin}>
                      <div className="relative mb-4">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="password" 
                            autoFocus
                            placeholder="Password"
                            className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 ${passwordError ? 'border-red-300 ring-red-200' : 'border-gray-300 ring-blue-200 focus:border-blue-500'}`}
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                          />
                      </div>
                      {passwordError && <p className="text-xs text-red-500 text-center mb-4">Incorrect password. Please try again.</p>}
                      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          Unlock Dashboard
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <Download size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Publish Changes</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                      You are about to download the updated <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">seedData.ts</code> file.
                      <br/><br/>
                      <span className="text-sm text-gray-500">
                          Replace the existing file in your project root with this one to make your changes live for everyone.
                      </span>
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowPublishModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                          Cancel
                      </button>
                      <button onClick={handlePublish} className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2">
                          <Download size={18} /> Download
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
