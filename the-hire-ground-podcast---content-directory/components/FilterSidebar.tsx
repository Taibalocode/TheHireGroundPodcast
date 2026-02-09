
import React from 'react';
import { FilterState } from '../types';
import { Search, Filter, X, Zap, LayoutGrid, PlaySquare } from 'lucide-react';
import { logEvent } from '../services/logger';
import { APP_VERSION } from '../constants';

interface FilterSidebarProps {
  videos: any[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  availableProfiles: string[];
  availableTopics: string[];
  isOpenMobile: boolean;
  closeMobile: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  filterState, 
  setFilterState, 
  availableProfiles, 
  availableTopics,
  isOpenMobile,
  closeMobile
}) => {
  
  const toggleProfile = (profile: string) => {
    const isAdding = !filterState.selectedProfiles.includes(profile);
    logEvent('FILTER_PROFILE', `${isAdding ? 'Added' : 'Removed'} profile: ${profile}`);
    
    setFilterState(prev => {
      const selected = prev.selectedProfiles.includes(profile)
        ? prev.selectedProfiles.filter(p => p !== profile)
        : [...prev.selectedProfiles, profile];
      return { ...prev, selectedProfiles: selected };
    });
  };

  const toggleTopic = (topic: string) => {
    const isAdding = !filterState.selectedTopics.includes(topic);
    logEvent('FILTER_TOPIC', `${isAdding ? 'Added' : 'Removed'} topic: ${topic}`);

    setFilterState(prev => {
      const selected = prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic];
      return { ...prev, selectedTopics: selected };
    });
  };

  const updateShortsFilter = (val: 'all' | 'shorts' | 'videos') => {
    logEvent('FILTER_SHORTS', `User filtered by format: ${val}`);
    setFilterState(prev => ({ ...prev, shortsFilter: val }));
  };

  const clearFilters = () => {
    logEvent('FILTER_CLEAR_ALL', 'User cleared all filters');
    setFilterState(prev => ({ 
      ...prev, 
      selectedProfiles: [], 
      selectedTopics: [], 
      searchQuery: '',
      shortsFilter: 'all' 
    }));
  };

  const isActive = filterState.selectedProfiles.length > 0 || 
                   filterState.selectedTopics.length > 0 || 
                   filterState.searchQuery.length > 0 ||
                   filterState.shortsFilter !== 'all';

  return (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col h-full
      ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:shadow-none
    `}>
      <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Filter size={20} className="text-blue-600"/>
          Directory
        </h2>
        <button onClick={closeMobile} className="lg:hidden text-gray-500 hover:text-gray-900 transition-colors">
           <X size={24} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-grow space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
        
        {/* Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search episodes..." 
              value={filterState.searchQuery}
              onChange={(e) => setFilterState(prev => ({...prev, searchQuery: e.target.value}))}
              onBlur={() => {
                if (filterState.searchQuery) {
                    logEvent('SEARCH_QUERY', filterState.searchQuery);
                }
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm transition-all bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Video Type Format Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Video Type</h3>
          <div className="grid grid-cols-1 gap-1">
            <button 
                onClick={() => updateShortsFilter('all')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'all' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <LayoutGrid size={14} /> All Content
            </button>
            <button 
                onClick={() => updateShortsFilter('videos')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'videos' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <PlaySquare size={14} /> Full Episodes
            </button>
            <button 
                onClick={() => updateShortsFilter('shorts')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${filterState.shortsFilter === 'shorts' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Zap size={14} className={filterState.shortsFilter === 'shorts' ? "text-amber-700" : "text-gray-400"} /> Shorts Only
            </button>
          </div>
        </div>

        {/* Clear Button */}
        {isActive && (
            <button 
                onClick={clearFilters}
                className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
            >
                <X size={12} /> Clear all filters
            </button>
        )}

        {/* Profiles Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">By Guest Profile</h3>
          <div className="space-y-2">
            {availableProfiles.map(profile => (
              <label key={profile} className="flex items-center gap-2 cursor-pointer group select-none">
                <div className={`
                  w-4 h-4 rounded border flex items-center justify-center transition-colors
                  ${filterState.selectedProfiles.includes(profile) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400 bg-white'}
                `}>
                  {filterState.selectedProfiles.includes(profile) && <X size={10} className="text-white transform rotate-45" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={filterState.selectedProfiles.includes(profile)}
                  onChange={() => toggleProfile(profile)}
                />
                <span className={`text-sm ${filterState.selectedProfiles.includes(profile) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {profile}
                </span>
              </label>
            ))}
            {availableProfiles.length === 0 && <p className="text-xs text-gray-400 italic">Add videos to see filters</p>}
          </div>
        </div>

        {/* Topics Filter */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">By Topic</h3>
          <div className="space-y-2">
            {availableTopics.map(topic => (
              <label key={topic} className="flex items-center gap-2 cursor-pointer group select-none">
                <div className={`
                  w-4 h-4 rounded border flex items-center justify-center transition-colors
                  ${filterState.selectedTopics.includes(topic) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 group-hover:border-emerald-400 bg-white'}
                `}>
                  {filterState.selectedTopics.includes(topic) && <X size={10} className="text-white transform rotate-45" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={filterState.selectedTopics.includes(topic)}
                  onChange={() => toggleTopic(topic)}
                />
                <span className={`text-sm ${filterState.selectedTopics.includes(topic) ? 'text-emerald-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {topic}
                </span>
              </label>
            ))}
             {availableTopics.length === 0 && <p className="text-xs text-gray-400 italic">Add videos to see filters</p>}
          </div>
        </div>

      </div>
      
      <div className="p-4 border-t border-gray-100 text-center shrink-0">
         <p className="text-xs text-gray-400">
             The Hire Ground © {new Date().getFullYear()} <span className="opacity-50">| v{APP_VERSION}</span>
         </p>
      </div>
    </div>
  );
};