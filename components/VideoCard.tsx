import React from 'react';
import { Youtube, Music, Edit2, Zap, Briefcase, Users, Tag } from 'lucide-react';
import { VideoEntry } from '../types';

export type ViewMode = 'list' | 'grid' | 'expanded';

interface VideoCardProps {
  video: VideoEntry;
  isAdmin: boolean;
  viewMode: ViewMode;
  onEdit: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, viewMode, onEdit }) => {
  // Logic for Expanded View (matches image_00f4eb.jpg)
  if (viewMode === 'expanded') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full">
        <img src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`} className="w-full aspect-video object-cover" />
        <div className="p-6 flex flex-col flex-1">
          <span className="text-blue-600 text-xs font-bold uppercase mb-1">Guest: {video.guestName}</span>
          <h3 className="font-bold text-xl mb-3 leading-tight">{video.title}</h3>
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
          </div>
        </div>
      </div>
    );
  }

  // Logic for Compact Grid (matches image_00f222.jpg)
  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
        <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} className="w-full aspect-video object-cover" />
        <div className="p-4">
          <span className="text-blue-600 text-[10px] font-bold uppercase">Guest: {video.guestName}</span>
          <h3 className="font-bold text-sm line-clamp-2 mt-1 mb-2">{video.title}</h3>
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
            {isAdmin && <button onClick={onEdit}><Edit2 size={12} /></button>}
          </div>
        </div>
      </div>
    );
  }

  // Default List View (matches image_008bcd.jpg)
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      <div className="md:w-64 shrink-0 aspect-video relative">
        <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover" />
        {video.isShort === 'Y' && <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Zap size={8} /> SHORT</span>}
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
           <div className="flex gap-2 text-[10px] font-bold text-blue-600 uppercase mb-1">
             <span>{video.guestName}</span>
             <span className="text-gray-300">•</span>
             <span className="text-gray-400">{new Date(video.publishedAt).toLocaleDateString()}</span>
           </div>
           <h3 className="font-bold text-gray-900 leading-tight mb-2">{video.title}</h3>
           <div className="flex flex-wrap gap-1.5">
             {video.guestProfiles.map(p => <span key={p} className="bg-purple-50 text-purple-600 text-[9px] px-2 py-0.5 rounded-md font-bold">{p}</span>)}
           </div>
        </div>
        <div className="flex justify-between items-center mt-4">
           <div className="flex gap-3 text-gray-400 font-bold text-[10px]">
             {video.youtubeId && <span className="flex items-center gap-1"><Youtube size={12} /> YouTube</span>}
             {video.spotifyUrl && <span className="flex items-center gap-1"><Music size={12} /> Spotify</span>}
           </div>
           {isAdmin && <button onClick={onEdit} className="text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>}
        </div>
      </div>
    </div>
  );
};