import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard';
import { videoStorage } from './services/storage';
import { Lock, Plus, List, LayoutGrid, Grid } from 'lucide-react';
import { AddVideoModal } from './components/AddVideoModal';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
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
      
      {/* 1. SIDEBAR */}
      <aside className="w-72 h-full border-r border-gray-200 bg-white shrink-0 z-20 relative">
        <FilterSidebar 
          videos={videos}
          filterState={filterState}
          setFilterState={setFilterState}
          availableProfiles={allProfiles}
          availableTopics={allTopics} 
          // Removed unnecessary mobile props from call since we disregarded them
        />
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      {/* Added 'isolation-auto' and explicit 'z-0' to ensure it doesn't get buried */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-0">
        
        {/* Header - Increased Z-index to 50 to beat everything except Modals */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 relative z-50 shadow-sm">
          <h1 className="font-bold text-xl">The Hire Ground Podcast</h1>
          
          <div className="flex items-center gap-4">
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

            {isAdminMode ? (
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus size={18} /> Add Video
              </button>
            ) : (
              <button 
                onClick={() => setShowPasswordModal(true)} 
                className="text-gray-400 flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer p-2 rounded-md hover:bg-gray-100"
              >
                <Lock size={18} /> Login
              </button>
            )}
          </div>
        </header>

        {/* Video Feed */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
               <p className="text-sm text-gray-500 font-medium">
                 Found <span className="text-blue-600 font-bold">{filteredVideos.length}</span> episodes
               </p>
            </div>

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

      {/* 3. MODALS */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Admin Access</h2>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <List size={20} className="rotate-45" /> {/* Simple X replacement */}
                </button>
              </div>
              <form onSubmit={handleAdminLogin}>
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Enter admin password"
                  className="w-full border border-gray-200 p-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                {passwordError && <p className="text-red-500 text-xs mb-4">Incorrect password. Please try again.</p>}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Login</button>
                </div>
              </form>
           </div>
        </div>
      )}

      
      {isModalOpen && (
  <AddVideoModal 
    isOpen={isModalOpen}
    onClose={() => { 
      setIsModalOpen(false); 
      setEditingVideo(null); 
    }}
    editVideo={editingVideo}
    // These functions now actually talk to your database/storage
    onAdd={async (video) => {
      await videoStorage.add(video);
      const updated = await videoStorage.getAll();
      setVideos(updated);
      setIsModalOpen(false);
    }}
    onUpdate={async (id, updates) => {
      await videoStorage.update(id, updates);
      const updated = await videoStorage.getAll();
      setVideos(updated);
      setIsModalOpen(false);
      setEditingVideo(null);
    }}
    onDelete={async (id) => {
      if (window.confirm('Are you sure you want to delete this video?')) {
        await videoStorage.delete(id);
        const updated = await videoStorage.getAll();
        setVideos(updated);
        setIsModalOpen(false);
        setEditingVideo(null);
      }
    }}
    // Pass the unique lists for the dropdowns/tags in the modal
    availableProfiles={allProfiles}
    availableTopics={allTopics}
    availableAudiences={[]} // You can add this logic later if needed
  />
)}
    </div>
  );
};

export default App;