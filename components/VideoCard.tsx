import React, { useState } from 'react';
import { VideoEntry } from '../types';
import { Play, ExternalLink, Edit2, Users, Briefcase, Tag, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export type ViewMode = 'detailed' | 'gallery' | 'list';

interface VideoCardProps {
  video: VideoEntry;
  isAdmin: boolean;
  onEdit: (video: VideoEntry) => void;
  viewMode?: ViewMode;
}

const PENDING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3EThumbnail Pending%3C/text%3E%3C/svg%3E";

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, onEdit, viewMode = 'detailed' }) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  const hasYoutube = video.youtubeId && video.youtubeId.trim().length > 0;
  const hasSpotify = video.spotifyUrl && video.spotifyUrl.trim().length > 0;
  
  const thumbnailUrl = hasYoutube 
    ? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg` 
    : PENDING_IMAGE;

  // Reusable Edit Button Overlay
  const EditButton = () => isAdmin ? (
    <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onEdit(video)}
        className="p-2 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-700 transition-all border border-gray-200"
        title="Edit Metadata"
      >
        <Edit2 size={16} />
      </button>
    </div>
  ) : null;

  // Reusable Shorts Badge
  const ShortsBadge = () => video.isShort === 'Y' ? (
    <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1">
      <Play size={10} className="fill-white" /> Short
    </div>
  ) : null;

  // Reusable Tags Block (Shows Profiles, Audiences, and Topics)
  const TagsBlock = () => (
    <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
        {video.guestProfiles?.map(p => (
            <span key={p} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                <Briefcase size={12} /> {p}
            </span>
        ))}
        {video.targetAudience?.map(a => (
            <span key={a} className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                <Users size={12} /> {a}
            </span>
        ))}
        {video.topics?.map(t => (
            <span key={t} className="px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-[10px] sm:text-xs flex items-center gap-1">
                <Tag size={12} /> {t}
            </span>
        ))}
    </div>
  );

  // Reusable Links Block
  const LinksBlock = () => (
    <div className="flex items-center gap-4 mt-auto pt-3 border-t border-gray-100">
        {hasYoutube && (
            <a href={`https://youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-medium text-red-600 hover:text-red-700">
                YouTube <ExternalLink size={14} className="ml-1" />
            </a>
        )}
        {hasSpotify && (
            <a href={video.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-medium text-green-600 hover:text-green-700">
                Spotify <ExternalLink size={14} className="ml-1" />
            </a>
        )}
    </div>
  );

  // ----------------------------------------
  // 1. LIST VIEW (Slim Rows)
  // ----------------------------------------
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex hover:shadow-md transition-shadow relative">
        <EditButton />
        <div className="w-32 sm:w-48 md:w-64 shrink-0 relative bg-gray-100">
          <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover aspect-video" onError={(e) => { e.currentTarget.src = PENDING_IMAGE; }} />
          <ShortsBadge />
        </div>
        <div className="p-3 md:p-4 flex flex-col flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm md:text-lg truncate">{video.title}</h3>
          {video.guestName && <div className="text-xs md:text-sm text-gray-500 font-medium mb-2">{video.guestName}</div>}
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2 hidden sm:block">{video.headline}</p>
          <div className="hidden md:flex flex-wrap gap-1 mt-auto mb-2">
             {video.guestProfiles?.map(p => <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{p}</span>)}
             {video.topics?.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{t}</span>)}
          </div>
          <div className="mt-auto pt-2 border-t border-gray-50">
             <LinksBlock />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 2. GALLERY VIEW (Grid Format)
  // ----------------------------------------
  if (viewMode === 'gallery') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative h-full">
        <EditButton />
        <div className="relative aspect-video bg-gray-100 shrink-0 w-full border-b border-gray-100">
          <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = PENDING_IMAGE; }} />
          <ShortsBadge />
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-1 text-xs text-gray-400 font-medium flex items-center justify-between">
             {video.publishedAt && <span className="flex items-center gap-1"><Calendar size={12}/> {video.publishedAt}</span>}
          </div>
          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
          {video.guestName && <div className="text-sm font-semibold text-gray-600 mb-2">{video.guestName}</div>}
          
          <TagsBlock />
          
          {/* Flex-1 pushes the links to the absolute bottom uniformly */}
          <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">{video.headline}</p>
          
          <LinksBlock />
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 3. DETAILED VIEW (Expanded Layout)
  // ----------------------------------------
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
       <EditButton />
       <div className="flex flex-col md:flex-row">
         <div className="w-full md:w-1/3 relative bg-gray-100 shrink-0">
            <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover aspect-video" onError={(e) => { e.currentTarget.src = PENDING_IMAGE; }} />
            <ShortsBadge />
         </div>
         <div className="p-4 md:p-6 flex flex-col flex-1 min-w-0">
            <div className="mb-2 text-xs text-gray-400 font-medium flex items-center gap-2">
               {video.publishedAt && <span className="flex items-center gap-1"><Calendar size={12}/> {video.publishedAt}</span>}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
            {video.guestName && <div className="text-base font-semibold text-gray-600 mb-2">{video.guestName}</div>}
            
            <TagsBlock />

            <div className="mt-4 text-gray-700 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="whitespace-pre-line">{showFullDesc && video.fullDescription ? video.fullDescription : video.headline}</p>
                {video.fullDescription && video.fullDescription !== video.headline && (
                    <button 
                        onClick={() => setShowFullDesc(!showFullDesc)}
                        className="text-blue-600 hover:text-blue-800 font-medium mt-2 flex items-center gap-1 text-sm"
                    >
                        {showFullDesc ? <><ChevronUp size={16}/> Show Less</> : <><ChevronDown size={16}/> Read Full Description</>}
                    </button>
                )}
            </div>

            <div className="mt-6">
                <LinksBlock />
            </div>
         </div>
       </div>
    </div>
  );
};