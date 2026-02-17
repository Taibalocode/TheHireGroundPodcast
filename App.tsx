import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { AddVideoModal } from './components/AddVideoModal';
import { Documentation } from './components/Documentation';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TagManager } from './components/TagManager';
import { logEvent, initLoggerSession, downloadLogsAsCsv, downloadLogsAsJson } from './services/logger';
import { videoStorage } from './services/storage';
import { searchVideosWithAI } from './services/geminiService';
import { APP_VERSION } from './constants';

// Corrected path for seedData.ts in the root directory
import { MASTER_SEED_DATA } from './seedData'; 

import { 
  Menu, Download, Settings, Sparkles, X, UploadCloud, Plus, Loader2, 
  BookOpen, RefreshCcw, Layout, FileSpreadsheet, Search, Cloud, 
  CloudOff, ShieldCheck, Lock, Key, FileJson, BarChart3, List, Grid, 
  Tags, Database, ArrowUpCircle 
} from 'lucide-react';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local'>('syncing');
  
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
    initLoggerSession();
    performCloudSync();
  }, []);

  const performCloudSync = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const fetchedVideos = await videoStorage.getAll();
      setVideos(fetchedVideos);
      setSyncStatus('synced');
      logEvent('SYNC_SUCCESS', `Fetched ${fetchedVideos.length} videos`);
    } catch (e) {
      console.error("Sync failed:", e);
      setSyncStatus('local');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateFromSeed = async () => {
    if (!window.confirm("This will upload all videos from your local seed file to Firestore. Continue?")) return;
    
    setIsLoading(true);
    try {
      for (const video of MASTER_SEED_DATA.videos) {
        const { id, createdAt, ...cleanVideo } = video as any; 
        await videoStorage.add(cleanVideo);
      }
      alert("Migration Successful!");
      await performCloudSync();
    } catch (err) {
      alert("Migration Failed. Check console.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoAdd = async (newVideo: Omit<VideoEntry, 'id' | 'createdAt'>) => {
    try {
      await videoStorage.add(newVideo);
      await performCloudSync();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding video.");
    }
  };

  const handleVideoUpdate = async (id: string, updates: Partial<VideoEntry>) => {
      await videoStorage.update(id, updates);
      await performCloudSync();
      setEditingVideo(null);
      setIsModalOpen(false);
  };

  const handleVideoDelete = async (id: string) => {
      if(window.confirm("Delete this video?")) {
          await videoStorage.delete(id);
          await performCloudSync();
          setEditingVideo(null);
          setIsModalOpen(false);
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdminMode(true);
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordError(false);
    } else {
        setPasswordError(true);
    }
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResultIds(null);
    setFilterState(prev => ({ ...prev, aiSearchActive: false, searchQuery: '' }));
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
      result = result.filter(v => v.title.toLowerCase().includes(q));
    }
    return result;
  }, [videos, filterState, aiResultIds]);

  if (isLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
              <p className="font-medium">Syncing with Firestore...</p>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      <FilterSidebar 
            videos={videos}
            filterState={filterState}
            setFilterState={setFilterState}
            availableProfiles={allProfiles}
            availableTopics={allTopics}
            isOpenMobile={isMobileMenuOpen}
            closeMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-30">
            <h1 className="font-bold text-xl">The Hire Ground Podcast</h1>
            
            <div className="flex items-center gap-4">
                {isAdminMode && (
                    <div className="relative">
                        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 hover:bg-gray-100 rounded-full">
                            <Settings size={20} />
                        </button>
                        
                        {isSettingsOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-xl z-50 p-2">
                                <button onClick={handleMigrateFromSeed} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2">
                                    <ArrowUpCircle size={14} /> Migrate Seed to Cloud
                                </button>
                                <button onClick={() => setIsAdminMode(false)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                                    Exit Admin
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isAdminMode ? (
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Plus size={18} /> Add Video
                    </button>
                ) : (
                    <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 hover:text-gray-600">
                        <Lock size={18} />
                    </button>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPasswordModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-sm shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-4">Admin Login</h3>
                  <form onSubmit={handleAdminLogin}>
                      <input 
                        type="password" 
                        placeholder="Password"
                        className="w-full p-2 border border-gray-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-100"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Login</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;