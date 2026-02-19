import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, FilterState } from './types';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoCard, ViewMode } from './components/VideoCard'; // Ensure ViewMode is exported from VideoCard
import { AddVideoModal } from './components/AddVideoModal';
import { videoStorage } from './services/storage';
import { Lock, Plus, X, List, LayoutGrid, Grid } from 'lucide-react';

const ADMIN_PASSWORD = "Ta1Bal0gun!";

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default view
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
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, []);

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

  const allProfiles = useMemo(() => Array.from(new Set(videos.flatMap(v => v.guestProfiles))).sort(), [videos]);
  const allTopics = useMemo(() => Array.from(new Set(videos.flatMap(v => v.topics))).sort(), [videos]);

  const filteredVideos = useMemo(() => {
  return videos.filter(video => {
    // 1. Filter by Search Query
    const matchesSearch = !filterState.searchQuery || 
      video.title.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      video.guestName.toLowerCase().includes(filterState.searchQuery.toLowerCase());

    // 2. Filter by Guest Profiles (Match ALL selected)
    const matchesProfiles = filterState.selectedProfiles.length === 0 || 
      filterState.selectedProfiles.every(p => video.guestProfiles.includes(p));

    // 3. Filter by Topics (Match ALL selected)
    const matchesTopics = filterState.selectedTopics.length === 0 || 
      filterState.selectedTopics.every(t => video.topics.includes(t));

    // 4. Filter by Shorts (SIMPLIFIED)
    // If 'all', we don't care about the 'isShort' status (always true).
    // If 'shorts', we only show videos where 'isShort' is 'Y'.
    const matchesShorts = filterState.shortsFilter === 'all' || 
                         (filterState.shortsFilter === 'shorts' && video.isShort === 'Y');

    return matchesSearch && matchesProfiles && matchesTopics && matchesShorts;
  });
}, [videos, filterState]);
  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <FilterSidebar 
        videos={videos}
        filterState={filterState}
        setFilterState={setFilterState}
        availableProfiles={allProfiles}
        availableTopics={allTopics} isOpenMobile={false} closeMobile={function (): void {
          throw new Error('Function not implemented.');
        } }      />

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-30">
          <h1 className="font-bold text-xl">The Hire Ground Podcast</h1>
          
          <div className="flex items-center gap-4">
            {/* Layout Toggles */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('expanded')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'expanded' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={18} />
              </button>
            </div>

            {isAdminMode ? (
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Add Video
              </button>
            ) : (
              <button onClick={() => setShowPasswordModal(true)} className="text-gray-400 hover:text-gray-600 flex items-center gap-2">
                <Lock size={18} /> Admin Login
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className={`grid gap-4 ${viewMode === 'list' ? 'grid-cols-1' : viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
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

      {/* Login Modal Code Remains the Same... */}
    </div>
  );
};

export default App;