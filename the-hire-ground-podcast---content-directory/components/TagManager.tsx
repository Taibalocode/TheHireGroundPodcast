
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VideoEntry } from '../types';
import { Tag, Users, Briefcase, Edit2, Trash2, ChevronRight, ChevronDown, Save, X, AlertCircle, Check, ArrowUpDown, ArrowUpAZ, Hash, Plus, Search } from 'lucide-react';
import { logEvent } from '../services/logger';
import { toTitleCase } from '../utils/stringUtils';

interface TagManagerProps {
  videos: VideoEntry[];
  onUpdate: (id: string, updates: Partial<VideoEntry>) => void;
}

type TagCategory = 'topics' | 'guestProfiles' | 'targetAudience';
type SortField = 'name' | 'count';

interface TagStat {
  name: string;
  count: number;
  videoIds: string[];
}

export const TagManager: React.FC<TagManagerProps> = ({ videos, onUpdate }) => {
  const [activeCategory, setActiveCategory] = useState<TagCategory>('topics');
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Selection Popup State
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // 1. Aggregate and Sort Data
  const tagStats = useMemo(() => {
    const stats: Record<string, TagStat> = {};

    videos.forEach(video => {
      // All categories are now string arrays, no special case needed
      const tags = (video[activeCategory] as string[]) || [];

      tags.forEach(tag => {
        if (!tag) return;
        if (!stats[tag]) {
          stats[tag] = { name: tag, count: 0, videoIds: [] };
        }
        stats[tag].count++;
        stats[tag].videoIds.push(video.id);
      });
    });

    const result = Object.values(stats);

    return result.sort((a, b) => {
      if (sortField === 'count') {
        return sortDirection === 'desc' ? b.count - a.count : a.count - b.count;
      } else {
        return sortDirection === 'desc' 
          ? b.name.localeCompare(a.name) 
          : a.name.localeCompare(b.name);
      }
    });
  }, [videos, activeCategory, sortField, sortDirection]);

  // Handle outside click for popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowAddPopup(false);
      }
    };
    if (showAddPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddPopup]);

  // If a tag is expanded and it no longer exists after an update, collapse it
  useEffect(() => {
    if (expandedTag && !tagStats.some(t => t.name === expandedTag)) {
        setExpandedTag(null);
    }
  }, [tagStats, expandedTag]);

  // 2. Actions
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const handleRename = (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) {
      setEditingTag(null);
      return;
    }

    const newName = toTitleCase(renameValue);
    const affectedTagStat = tagStats.find(t => t.name === oldName);
    if (!affectedTagStat) return;

    logEvent('TAG_RENAME', `Renamed ${activeCategory}: "${oldName}" to "${newName}"`);

    affectedTagStat.videoIds.forEach(videoId => {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      const currentTags = (video[activeCategory] as string[]) || [];
      const filtered = currentTags.filter(t => t !== oldName);
      if (!filtered.includes(newName)) {
        filtered.push(newName);
      }
      onUpdate(videoId, { [activeCategory]: filtered.sort() });
    });

    setEditingTag(null);
    setRenameValue('');
  };

  const handleDeleteGlobal = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const affectedTagStat = tagStats.find(t => t.name === tagName);
    if (!affectedTagStat) return;

    if (!window.confirm(`⚠️ DELETE METADATA ⚠️\n\nAre you sure you want to remove "${tagName}" from ALL ${affectedTagStat.count} videos?\n\nThis cannot be undone.`)) return;

    logEvent('TAG_DELETE_GLOBAL', `Deleted ${activeCategory}: "${tagName}"`);

    affectedTagStat.videoIds.forEach(videoId => {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      const currentTags = (video[activeCategory] as string[]) || [];
      const filtered = currentTags.filter(t => t !== tagName);
      onUpdate(videoId, { [activeCategory]: filtered });
    });
    
    setExpandedTag(null);
  };

  const handleRemoveFromVideo = (videoId: string, tagName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    logEvent('TAG_REMOVE_SINGLE', `Removed ${activeCategory}: "${tagName}" from video ${videoId}`);

    const currentTags = (video[activeCategory] as string[]) || [];
    const filtered = currentTags.filter(t => t !== tagName);
    onUpdate(videoId, { [activeCategory]: filtered });
  };

  const handleAddVideoToTag = (videoId: string, tagName: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    logEvent('TAG_ADD_SINGLE', `Added ${activeCategory}: "${tagName}" to video ${videoId}`);

    const currentTags = (video[activeCategory] as string[]) || [];
    if (!currentTags.includes(tagName)) {
      onUpdate(videoId, { [activeCategory]: [...currentTags, tagName].sort() });
    }
    setShowAddPopup(false);
  };

  const startEditing = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTag(tagName);
    setRenameValue(tagName);
  };

  const getVideoDetails = (id: string) => videos.find(v => v.id === id);

  // Filter list of videos available to be added to the current expanded tag
  const availableVideosForTag = useMemo(() => {
    if (!expandedTag) return [];
    
    return videos
      .filter(v => {
        const currentTags = (v[activeCategory] as string[]) || [];
        // Only show videos that DON'T already have this tag
        return !currentTags.includes(expandedTag);
      })
      .filter(v => {
        if (!videoSearchQuery) return true;
        const q = videoSearchQuery.toLowerCase();
        return (v.guestName || '').toLowerCase().includes(q) || 
               v.title.toLowerCase().includes(q) ||
               v.youtubeId.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const nameA = a.guestName || 'Solo Episode';
        const nameB = b.guestName || 'Solo Episode';
        return nameA.localeCompare(nameB);
      });
  }, [videos, expandedTag, activeCategory, videoSearchQuery]);

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24 animate-fadeIn">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Tag className="text-blue-600" />
          Tag Manager
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Consolidate duplicate tags, fix typos, and manage your metadata taxonomy from a single view.
        </p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 inline-flex">
        <button
          onClick={() => { setActiveCategory('topics'); setExpandedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'topics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Tag size={16} /> Topics
        </button>
        <button
          onClick={() => { setActiveCategory('guestProfiles'); setExpandedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'guestProfiles' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Briefcase size={16} /> Guest Profiles
        </button>
        <button
          onClick={() => { setActiveCategory('targetAudience'); setExpandedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'targetAudience' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> Target Audience
        </button>
      </div>

      {/* REMOVED overflow-hidden here to allow dropdowns to spill over */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <div className="flex items-center gap-6">
            <div className="text-sm font-semibold text-gray-700">
              {tagStats.length} Unique Tags Found
            </div>
            
            {/* Sorting Controls */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
               <button 
                onClick={() => toggleSort('name')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${sortField === 'name' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                 <ArrowUpAZ size={14} /> Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
               </button>
               <button 
                onClick={() => toggleSort('count')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${sortField === 'count' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                 <Hash size={14} /> Frequency {sortField === 'count' && (sortDirection === 'asc' ? '↑' : '↓')}
               </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 italic hidden sm:block">
            Tip: Rename a tag to an existing name to merge them.
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {tagStats.map((stat, index) => (
            <div key={stat.name} className={`group transition-colors hover:bg-gray-50 ${index === tagStats.length - 1 ? 'rounded-b-xl' : ''}`}>
              
              <div 
                className="flex items-center justify-between px-6 py-3 cursor-pointer"
                onClick={() => setExpandedTag(expandedTag === stat.name ? null : stat.name)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    type="button"
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                  >
                    {expandedTag === stat.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {editingTag === stat.name ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(stat.name)}
                      />
                      <button onClick={() => handleRename(stat.name)} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check size={14}/></button>
                      <button onClick={() => setEditingTag(null)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{stat.name}</span>
                      {stat.count < 2 && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Low usage tag. Consider consolidating.">
                          <AlertCircle size={10} /> Rare
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {stat.count} {stat.count === 1 ? 'video' : 'videos'}
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => startEditing(stat.name, e)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Rename / Merge"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleDeleteGlobal(stat.name, e)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete from all videos"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {expandedTag === stat.name && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 shadow-inner relative">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                      Videos tagged with "{stat.name}"
                    </h4>
                    
                    <div className="relative">
                      <button 
                        onClick={() => { setShowAddPopup(!showAddPopup); setVideoSearchQuery(''); }}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <Plus size={12} /> Add Video
                      </button>

                      {showAddPopup && (
                        <div 
                          ref={popupRef}
                          className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-slideDown"
                        >
                          <div className="p-2 border-b border-gray-100">
                             <div className="relative">
                               <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                               <input 
                                 type="text"
                                 autoFocus
                                 placeholder="Search videos by guest or title..."
                                 value={videoSearchQuery}
                                 onChange={(e) => setVideoSearchQuery(e.target.value)}
                                 className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                               />
                             </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                            {availableVideosForTag.length > 0 ? (
                              availableVideosForTag.map(v => (
                                <button 
                                  key={v.id}
                                  onClick={() => handleAddVideoToTag(v.id, stat.name)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors group"
                                >
                                  <div className="font-bold text-xs text-blue-700 group-hover:text-blue-900 truncate">
                                    {v.guestName || 'Solo Episode'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate">
                                    {v.title}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-xs italic">
                                {videoSearchQuery ? 'No matches found.' : 'All videos are already tagged.'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {stat.videoIds.map(vidId => {
                      const v = getVideoDetails(vidId);
                      if (!v) return null;
                      return (
                        <div key={vidId} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-sm">
                          <div className="truncate pr-2">
                            <span className="font-medium text-gray-700 block truncate">{v.title}</span>
                            {v.guestName && <span className="text-xs text-gray-400">{v.guestName}</span>}
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => handleRemoveFromVideo(vidId, stat.name, e)}
                            className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                            title="Remove tag from this video only"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {tagStats.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No tags found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
