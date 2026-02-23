import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { Lock, Plus, List, LayoutGrid, Grid } from 'lucide-react';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [videos, setVideos] = useState<VideoEntry[]>([]);
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
    {/* 1. SIDEBAR WRAPPER: Fixes the 'unclickable' issue by shrinking to w-0 when closed */}
    <div 
      className={`z-40 transition-all duration-300 
        ${isMobileMenuOpen ? 'w-full fixed inset-0 bg-black/20' : 'w-0 lg:w-72'} 
        ${!isMobileMenuOpen ? 'pointer-events-none lg:pointer-events-auto' : 'pointer-events-auto'}`}
    >
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

    {/* 2. MAIN CONTENT WRAPPER */}
    <div className="flex-1 flex flex-col h-full min-w-0 relative">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-30 relative">
        <h1 className="font-bold text-xl">The Hire Ground Podcast</h1>
        
        <div className="flex items-center gap-4">
          {/* Layout Toggles */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            {(['list', 'grid', 'expanded'] as ViewMode[]).map((mode) => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {mode === 'list' && <List size={18} />}
                {mode === 'grid' && <LayoutGrid size={18} />}
                {mode === 'expanded' && <Grid size={18} />}
              </button>
            ))}
          </div>

          {/* Admin Actions */}
          {isAdminMode ? (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} /> Add Video
            </button>
          ) : (
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="text-gray-400 flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <Lock size={18} /> Login
            </button>
          )}
        </div>
      </header>

      {/* 3. SCROLLABLE VIDEO GRID */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Results Counter */}
          <div className="mb-6 flex items-center justify-between">
             <p className="text-sm text-gray-500 font-medium">
               Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes
             </p>
          </div>

          {/* Video Grid */}
          <div className={`grid gap-4 ${
            viewMode === 'list' ? 'grid-cols-1' : 
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
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

    {/* Modals & Overlays should be rendered here */}
  </div>
);
};

export default App;