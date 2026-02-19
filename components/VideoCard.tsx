import React from 'react';
import { Youtube, Music, Edit2, Zap } from 'lucide-react';
import { VideoEntry } from '../types';

interface VideoCardProps {
  video: VideoEntry;
  isAdmin: boolean;
  onEdit: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, onEdit }) => {
  return (
    <div className="group flex flex-col md:flex-row bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative w-full md:w-64 shrink-0 aspect-video">
        <img 
          src={video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` : '/spotify-placeholder.png'} 
          className="w-full h-full object-cover"
          alt={video.title}
        />
        {video.isShort === 'Y' && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <Zap size={10} /> SHORT
          </span>
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-tight">{video.guestName}</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-400">{new Date(video.publishedAt).toLocaleDateString()}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">
            {video.title}
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {video.guestProfiles.map(profile => (
              <span key={profile} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-md border border-purple-100">
                {profile}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-gray-400 text-xs font-medium">
            {video.youtubeId && <span className="flex items-center gap-1"><Youtube size={14} /> YouTube</span>}
            {video.spotifyUrl && <span className="flex items-center gap-1"><Music size={14} /> Spotify</span>}
          </div>
          {isAdmin && (
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};