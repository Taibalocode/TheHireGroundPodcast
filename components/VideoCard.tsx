import React from 'react';
import { VideoEntry } from '../types';
import { Play, ExternalLink, Edit2, Users, Briefcase, Tag, Calendar } from 'lucide-react';

export type ViewMode = 'detailed' | 'gallery' | 'list';

interface VideoCardProps {
  video: VideoEntry;
  isAdmin: boolean;
  onEdit: (video: VideoEntry) => void;
  viewMode?: ViewMode;
}

const PENDING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3EThumbnail Pending%3C/text%3E%3C/svg%3E";

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, onEdit, viewMode = 'detailed' }) => {
  const hasYoutube = video.youtubeId && video.youtubeId.trim().length > 0;
  const hasSpotify = video.spotifyUrl && video.spotifyUrl.trim().length > 0;
  
  const thumbnailUrl = hasYoutube 
    ? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg` 
    : PENDING_IMAGE;

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

  const ShortsBadge = () => video.isShort === 'Y' ? (
    <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1">
      <Play size={10} className="fill-white" /> Short
    </div>
  ) : null;

  // STRUCTURED TAGS FOR THE 5-COLUMN EXPANDED GRID
  const StructuredTagsBlock = () => (
    <div className="flex flex-col gap-2 mt-2 mb-3">
      {video.guestProfiles && video.guestProfiles.length > 0 && (
        <div className="flex items-start gap-1">
          <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 w-[72px] shrink-0 pt-0.5">
            <Briefcase size={12} className="shrink-0"/> Tags:
          </div>
          <div className="flex flex-wrap gap-1 flex-1">
            {video.guestProfiles.map(p => (
              <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-[4px] text-[10px] font-semibold">{p}</span>
            ))}
          </div>
        </div>
      )}
      
      {video.targetAudience && video.targetAudience.length > 0 && (
        <div className="flex items-start gap-1">
          <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 w-[72px] shrink-0 pt-0.5">
            <Users size={12} className="shrink-0"/> Audience:
          </div>
          <div className="flex flex-wrap gap-1 flex-1">
            {video.targetAudience.map(a => (
              <span key={a} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-[4px] text-[10px] font-semibold">{a}</span>
            ))}
          </div>
        </div>
      )}

      {video.topics && video.topics.length > 0 && (
        <div className="flex items-start gap-1">
          <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 w-[72px] shrink-0 pt-0.5">
            <Tag size={12} className="shrink-0"/> Topics:
          </div>
          <div className="flex flex-wrap gap-1 flex-1">
            {video.topics.map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-[4px] text-[10px] font-medium">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const LinksBlock = () => (
    <div className="flex items-center gap-4 mt-auto pt-3 border-t border-gray-100">
        {hasYoutube && (
            <a href={`https://youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs font-bold text-red-600 hover:text-red-700">
                YouTube <ExternalLink size={12} className="ml-1" />
            </a>
        )}
        {hasSpotify && (
            <a href={video.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs font-bold text-green-600 hover:text-green-700">
                Spotify <ExternalLink size={12} className="ml-1" />
            </a>
        )}
    </div>
  );

  // 1. LIST VIEW (Horizontal Rows)
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
          <div className="flex-1">
             <StructuredTagsBlock />
          </div>
          <div className="mt-auto pt-2 border-t border-gray-50">
             <LinksBlock />
          </div>
        </div>
      </div>
    );
  }

  // 2. GALLERY VIEW (3 Columns - Wide cards, shows Description, hides massive tag list)
  if (viewMode === 'gallery') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative h-full">
        <EditButton />
        <div className="relative aspect-video bg-gray-100 shrink-0 w-full border-b border-gray-100">
          <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = PENDING_IMAGE; }} />
          <ShortsBadge />
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-2 text-xs text-gray-400 font-medium flex items-center justify-between">
              {video.publishedAt && <span className="flex items-center gap-1"><Calendar size={12}/> {video.publishedAt}</span>}
          </div>
          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
          {video.guestName && <div className="text-sm font-semibold text-gray-600 mb-3">{video.guestName}</div>}
          
          {/* Simple Inline Tags so it doesn't take up the whole card */}
          <div className="flex flex-wrap gap-1.5 mb-3">
             {video.guestProfiles?.slice(0, 2).map(p => <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-semibold border border-blue-100">{p}</span>)}
             {video.topics?.slice(0, 2).map(t => <span key={t} className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md text-[10px] font-medium border border-gray-200">{t}</span>)}
          </div>
          
          {/* Headline Description pushed down to fill space */}
          <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">{video.headline}</p>
          
          <LinksBlock />
        </div>
      </div>
    );
  }

  // 3. DETAILED/EXPANDED VIEW (5 Columns - Focuses heavily on the Structured Tags block)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative h-full">
      <EditButton />
      <div className="relative aspect-video bg-gray-100 shrink-0 w-full border-b border-gray-100">
        <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = PENDING_IMAGE; }} />
        <ShortsBadge />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="mb-1 text-[10px] sm:text-xs text-gray-400 font-medium flex items-center justify-between">
            {video.publishedAt && <span className="flex items-center gap-1"><Calendar size={12}/> {video.publishedAt}</span>}
        </div>
        <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
        {video.guestName && <div className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">{video.guestName}</div>}
        
        {/* Full Tags Block instead of Description */}
        <div className="flex-1 mt-1 mb-2">
            <StructuredTagsBlock />
        </div>
        
        <LinksBlock />
      </div>
    </div>
  );
};