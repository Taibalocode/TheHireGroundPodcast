import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { Lock, Plus, List, LayoutGrid, Grid, Menu } from 'lucide-react';
import { AddVideoModal } from './components/AddVideoModal';

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

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden">
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-lg md:text-xl truncate">The Hire Ground</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              {(['list', 'grid', 'expanded'] as ViewMode[]).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                >
                  {mode === 'list' && <List size={18} />}
                  {mode === 'grid' && <LayoutGrid size={18} />}
                  {mode === 'expanded' && <Grid size={18} />}
                </button>
              ))}
            </div>

            {isAdminMode ? (
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-3 py-2 md:px-4 rounded-lg flex items-center gap-2 text-sm font-medium">
                <Plus size={18} /> <span className="hidden md:inline">Add Video</span>
              </button>
            ) : (
              <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer text-sm">
                <Lock size={18} /> <span className="hidden md:inline">Login</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
               <p className="text-sm text-gray-500 font-medium">
                 Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes
               </p>
            </div>

            <div className={`grid gap-4 ${
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

      {/* Modals rendered here */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Admin Login</h2>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="password" 
                autoFocus
                className="w-full border p-2 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Login</button>
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