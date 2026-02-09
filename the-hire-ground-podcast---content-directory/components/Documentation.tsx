
import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  User, 
  Zap, 
  Database, 
  Layers, 
  Cpu, 
  Info,
  ExternalLink,
  CheckCircle,
  RefreshCcw,
  Copy,
  AlertTriangle,
  UploadCloud,
  Globe,
  Sparkles,
  FileCode
} from 'lucide-react';

export const Documentation: React.FC = () => {
  const sections = [
    {
      id: 'overview',
      title: 'Platform Overview',
      icon: <Info className="text-blue-600" size={20} />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 leading-relaxed">
            The Hire Ground Directory is a smart content management system designed to organize and surface podcast episodes. It leverages Google Gemini AI to transform raw video data into structured career intelligence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                <ShieldCheck size={16} /> Admin Mode
              </h4>
              <p className="text-sm text-blue-800">For content creators. Allows adding episodes, bulk importing via AI, and system maintenance.</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                <User size={16} /> Viewer Mode
              </h4>
              <p className="text-sm text-emerald-800">For the audience. Discovery via semantic AI search and profile-based filtering.</p>
            </div>
          </div>
        </div>
      )
    },
    {
        id: 'publishing',
        title: 'Updating the Master Data (Important)',
        icon: <FileCode className="text-emerald-600" size={20} />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              The application does not use a database server. Instead, it bundles all data into a single TypeScript file called <code>seedData.ts</code>. This ensures the app is fast, offline-capable, and easy to host.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
              <p className="text-sm text-amber-800 font-medium">
                <strong>Key Concept:</strong> You must update the source code file to go live.
              </p>
            </div>
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500 font-bold">1</div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Make Changes</h4>
                        <p className="text-xs text-gray-500">Add or edit videos in the Admin Dashboard. These changes are saved in your browser (Local Draft).</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">2</div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Download seedData.ts</h4>
                        <p className="text-xs text-gray-500">Click the green <strong>"Publish"</strong> button. The system will generate a completely new <code>seedData.ts</code> file containing all your latest changes.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold">3</div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Replace & Deploy</h4>
                        <p className="text-xs text-gray-500">Take the downloaded file and overwrite the existing <code>seedData.ts</code> in the project's root folder. Then, commit/deploy your code updates.</p>
                    </div>
                </div>
            </div>
          </div>
        )
      },
    {
      id: 'standardization',
      title: 'Data Standardization (Auto-Clean)',
      icon: <Sparkles className="text-violet-600" size={20} />,
      content: (
        <div className="space-y-4">
           <p className="text-gray-600">
             To keep the directory clean and professional, the system automatically enforces <strong>Title Casing</strong> on all metadata.
           </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <h5 className="font-bold text-gray-800 text-sm mb-1">Smart Formatting</h5>
                 <p className="text-xs text-gray-500">
                   Inputs like "software engineer" become <strong>"Software Engineer"</strong>.
                   Duplicate tags (e.g., "Sales" vs "sales") are automatically merged into one.
                 </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <h5 className="font-bold text-gray-800 text-sm mb-1">Acronym Intelligence</h5>
                 <p className="text-xs text-gray-500">
                   Common industry terms are preserved. The system knows that "ceo" should be <strong>"CEO"</strong> and "ai" should be <strong>"AI"</strong>, not "Ai".
                 </p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: 'merging',
      title: 'Intelligent Merging Logic',
      icon: <Copy className="text-amber-600" size={20} />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            The system prevents duplicate entries by tracking unique identifiers. When you add or import a video that already exists, the system performs an <strong>Intelligent Merge</strong>:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
            <li><strong>Identification:</strong> Videos are matched based on their 11-character YouTube ID or their Spotify URL.</li>
            <li><strong>Tag Merging:</strong> Guest Profiles and Topics from the new entry are combined with existing ones.</li>
            <li><strong>Enrichment:</strong> If the new entry has more detailed headlines, the existing record is updated.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'maintenance',
      title: 'Maintenance & Recovery',
      icon: <RefreshCcw className="text-red-600" size={20} />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">Admins have access to powerful recovery tools:</p>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h5 className="font-bold text-gray-900 text-sm">JSON Backup</h5>
              <p className="text-xs text-gray-500">Download the entire database to a file for external storage or migration.</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <h5 className="font-bold text-red-900 text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-600" /> Factory Reset
              </h5>
              <p className="text-xs text-red-800">Clears all your local drafts and pulls the latest Global Master from <code>seedData.ts</code>. Use this if your local draft gets out of sync.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fadeIn pb-24">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
          <BookOpen size={14} /> Documentation
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          System Guide & Workflows
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Learn how to manage, publish, and organize The Hire Ground Podcast content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              {section.icon}
              <h2 className="font-bold text-gray-900 text-xl">{section.title}</h2>
            </div>
            <div className="p-6 md:p-8">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-10 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400 mb-4 flex items-center justify-center gap-4">
            <span>The Hire Ground Podcast Directory</span>
            <span>•</span>
            <a href="https://www.youtube.com/@TheHireGroundPodcast" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                Website <ExternalLink size={12} />
            </a>
        </p>
      </div>
    </div>
  );
};