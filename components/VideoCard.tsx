import React from 'react';
import { Youtube, Music, Edit2, Zap, Briefcase, Tag } from 'lucide-react';
import { VideoEntry } from '../types';

export type ViewMode = 'list' | 'grid' | 'expanded';

interface VideoCardProps {
  video: VideoEntry;
  isAdmin: boolean;
  viewMode: ViewMode;
  onEdit: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, viewMode, onEdit }) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;

  // Logic for Expanded View
  if (viewMode === 'expanded') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full">
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
          <img src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`} className="w-full aspect-video object-cover transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        </a>
        <div className="p-6 flex flex-col flex-1">
          <span className="text-blue-600 text-xs font-bold uppercase mb-1">Guest: {video.guestName}</span>
          <h3 className="font-bold text-xl mb-3 leading-tight">
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">{video.title}</a>
          </h3>
          <p className="text-gray-500 text-sm line-clamp-3 mb-4">{video.headline}</p>
          
          <div className="space-y-3 mt-auto">
             <div className="flex flex-wrap gap-2">
                <Briefcase size={14} className="text-gray-400" />
                {video.guestProfiles.map(p => <span key={p} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{p}</span>)}
             </div>
             <div className="flex flex-wrap gap-2">
                <Tag size={14} className="text-gray-400" />
                {video.topics.slice(0, 3).map(t => <span key={t} className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{t}</span>)}
             </div>
             <div className="flex gap-4 pt-2 border-t border-gray-50">
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700">
                  <Youtube size={14} /> YouTube
                </a>
                {video.spotifyUrl && (
                  <a href={video.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700">
                    <Music size={14} /> Spotify
                  </a>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Logic for Compact Grid
  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="block relative">
          <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} className="w-full aspect-video object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </a>
        <div className="p-4">
          <span className="text-blue-600 text-[10px] font-bold uppercase">Guest: {video.guestName}</span>
          <h3 className="font-bold text-sm line-clamp-2 mt-1 mb-2 hover:text-blue-600 transition-colors">
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">{video.title}</a>
          </h3>
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'N/A'}</span>
            <div className="flex gap-2">
              {isAdmin && <button onClick={onEdit} className="hover:text-blue-600"><Edit2 size={12} /></button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default List View
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
      <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="md:w-64 shrink-0 aspect-video relative block overflow-hidden">
        <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        {video.isShort === 'Y' && <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-10"><Zap size={8} /> SHORT</span>}
      </a>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
           <div className="flex gap-2 text-[10px] font-bold text-blue-600 uppercase mb-1">
             <span>{video.guestName}</span>
             <span className="text-gray-300">•</span>
             <span className="text-gray-400">{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'N/A'}</span>
           </div>
           <h3 className="font-bold text-gray-900 leading-tight mb-2 hover:text-blue-600 transition-colors text-lg">
             <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">{video.title}</a>
           </h3>
           <div className="flex flex-wrap gap-1.5">
             {video.guestProfiles.map(p => <span key={p} className="bg-purple-50 text-purple-600 text-[9px] px-2 py-0.5 rounded-md font-bold">{p}</span>)}
           </div>
        </div>
        <div className="flex justify-between items-center mt-4">
           <div className="flex gap-4">
             {video.youtubeId && (
               <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-red-600 font-bold text-[10px] transition-colors">
                 <Youtube size={14} /> YouTube
               </a>
             )}
             {video.spotifyUrl && (
               <a href={video.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-green-600 font-bold text-[10px] transition-colors">
                 <Music size={14} /> Spotify
               </a>
             )}
           </div>
           {isAdmin && <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-50 transition-all"><Edit2 size={14} /></button>}
        </div>
      </div>
    </div>
  );
};