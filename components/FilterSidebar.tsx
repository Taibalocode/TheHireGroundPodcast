import React from 'react';
import { FilterState, VideoEntry } from '../types';
import { Search, Filter, X, Zap, LayoutGrid, PlaySquare } from 'lucide-react';

interface FilterSidebarProps {
  videos: VideoEntry[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  availableProfiles: string[];
  availableTopics: string[];
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  filterState, 
  setFilterState, 
  availableProfiles, 
  availableTopics
}) => {
  
  const toggleProfile = (profile: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedProfiles: prev.selectedProfiles.includes(profile)
        ? prev.selectedProfiles.filter(p => p !== profile)
        : [...prev.selectedProfiles, profile]
    }));
  };

  const toggleTopic = (topic: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic]
    }));
  };

  const isActive = filterState.selectedProfiles.length > 0 || 
                   filterState.selectedTopics.length > 0 || 
                   filterState.searchQuery.length > 0 ||
                   filterState.shortsFilter !== 'all';

  return (
    // FIXED: Removed 'fixed', 'inset-y-0', 'z-40', and 'transform' logic.
    // It now occupies its own space in the flex container.
    <div className="w-full bg-white flex flex-col h-full border-r border-gray-200">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Filter size={20} className="text-blue-600"/>
          Directory
        </h2>
      </div>

      <div className="p-4 overflow-y-auto flex-grow space-y-8">
        {/* Search Input */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search episodes..." 
              value={filterState.searchQuery}
              onChange={(e) => setFilterState(prev => ({...prev, searchQuery: e.target.value}))}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 outline-none text-sm transition-all bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Video Type Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Video Type</h3>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setFilterState(p => ({...p, shortsFilter: 'all'}))} 
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'all' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={14}/> All Content
            </button>
            <button 
              onClick={() => setFilterState(p => ({...p, shortsFilter: 'videos'}))} 
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'videos' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <PlaySquare size={14}/> Full Episodes
            </button>
            <button 
              onClick={() => setFilterState(p => ({...p, shortsFilter: 'shorts'}))} 
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'shorts' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Zap size={14}/> Shorts Only
            </button>
          </div>
        </div>

        {/* Clear Filters Button */}
        {isActive && (
          <button 
            onClick={() => setFilterState(prev => ({ ...prev, selectedProfiles: [], selectedTopics: [], searchQuery: '', shortsFilter: 'all' }))} 
            className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Clear all filters
          </button>
        )}

        {/* Guest Profile Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Guest Profile</h3>
          <div className="space-y-2">
            {availableProfiles.map(profile => (
              <label key={profile} className="flex items-center gap-2 cursor-pointer group select-none">
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={filterState.selectedProfiles.includes(profile)} 
                  onChange={() => toggleProfile(profile)} 
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterState.selectedProfiles.includes(profile) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400 bg-white'}`}>
                  {filterState.selectedProfiles.includes(profile) && <X size={10} className="text-white transform rotate-45" />}
                </div>
                <span className={`text-sm transition-colors ${filterState.selectedProfiles.includes(profile) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {profile}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Topics Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Topics</h3>
          <div className="space-y-2">
            {availableTopics.map(topic => (
              <label key={topic} className="flex items-center gap-2 cursor-pointer group select-none">
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={filterState.selectedTopics.includes(topic)} 
                  onChange={() => toggleTopic(topic)} 
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterState.selectedTopics.includes(topic) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 group-hover:border-emerald-400 bg-white'}`}>
                  {filterState.selectedTopics.includes(topic) && <X size={10} className="text-white transform rotate-45" />}
                </div>
                <span className={`text-sm transition-colors ${filterState.selectedTopics.includes(topic) ? 'text-emerald-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {topic}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 text-center shrink-0">
        <p className="text-xs text-gray-400 font-medium">
          The Hire Ground © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};