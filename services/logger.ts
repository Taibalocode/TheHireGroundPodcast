
export interface LogEntry {
  timestamp: string;
  easternTime: string;
  action: string;
  details?: string;
  session: {
    ip: string;
    city: string;
    region: string;
    country: string;
    userAgent: string;
    screenSize: string;
    referrer: string;
  };
}

export interface MarketingStats {
  totalSessions: number;
  topCountries: { name: string; count: number }[];
  topProfiles: { name: string; count: number }[];
  topTopics: { name: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  recentSearches: { query: string; timestamp: string; resultsCount: number }[];
  conversionEvents: { name: string; count: number }[];
}

const LOG_KEY = 'hire_ground_activity_logs';

// In-memory cache for session data to avoid repeated API calls
let currentSessionData = {
  ip: 'Loading...',
  city: 'Unknown',
  region: 'Unknown',
  country: 'Unknown',
  userAgent: navigator.userAgent,
  screenSize: `${window.innerWidth}x${window.innerHeight}`,
  referrer: document.referrer || 'Direct'
};

/**
 * Initializes the session by fetching GeoIP data.
 * Call this once when the App mounts.
 */
export const initLoggerSession = async () => {
  try {
    // Using a reliable public IP API (Note: Free tiers have rate limits; handle gracefully)
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      currentSessionData = {
        ...currentSessionData,
        ip: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
      };
      // Log the session start once we have data
      logEvent('SESSION_START', 'User session initialized with Geo Data');
    }
  } catch (error) {
    console.warn("Logger: Could not fetch GeoIP data (likely ad-blocker or offline).");
    currentSessionData.ip = 'Anonymous/Blocked';
    logEvent('SESSION_START', 'User session initialized (Geo Blocked)');
  }
};

/**
 * Logs an event to localStorage immediately using a Read-Modify-Write strategy.
 * Includes Marketing context (Time, Location, Device).
 */
export const logEvent = (action: string, details: string = '') => {
  try {
    const existingLogs = localStorage.getItem(LOG_KEY);
    const logs: LogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];
    
    // Get US Eastern Time
    const easternTime = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "medium"
    });

    const newEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      easternTime,
      action,
      details,
      session: { ...currentSessionData } // Snapshot current session state
    };
    
    logs.push(newEntry);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error("Failed to log event:", error);
  }
};

/**
 * Reads logs fresh from the disk.
 */
export const getLogs = (): LogEntry[] => {
  try {
    const existingLogs = localStorage.getItem(LOG_KEY);
    return existingLogs ? JSON.parse(existingLogs) : [];
  } catch (error) {
    return [];
  }
};

/**
 * Aggregates logs into consumable marketing statistics.
 */
export const getMarketingStats = (): MarketingStats => {
  const logs = getLogs();
  const stats: MarketingStats = {
    totalSessions: 0,
    topCountries: [],
    topProfiles: [],
    topTopics: [],
    dailyActivity: [],
    recentSearches: [],
    conversionEvents: []
  };

  const countryMap = new Map<string, number>();
  const profileMap = new Map<string, number>();
  const topicMap = new Map<string, number>();
  const dateMap = new Map<string, number>();
  const conversionMap = new Map<string, number>();

  logs.forEach(log => {
    // 1. Session & Geo Logic
    if (log.action === 'SESSION_START' || log.action === 'APP_SESSION_START') {
      stats.totalSessions++;
      const country = log.session?.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
      
      const dateKey = log.timestamp.split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }

    // 2. Filter Interest
    if (log.action === 'FILTER_PROFILE' && log.details?.includes('Added')) {
      const profile = log.details.replace('Added profile: ', '').trim();
      profileMap.set(profile, (profileMap.get(profile) || 0) + 1);
    }
    if (log.action === 'FILTER_TOPIC' && log.details?.includes('Added')) {
      const topic = log.details.replace('Added topic: ', '').trim();
      topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
    }

    // 3. Search Intent
    if (log.action === 'AI_SEARCH_QUERY') {
      // Parse details format: 'Prompt: "query" | Results (N): ...'
      const match = log.details?.match(/Prompt: "(.*?)" \| Results \((\d+)\)/);
      if (match) {
        stats.recentSearches.push({
          query: match[1],
          resultsCount: parseInt(match[2]),
          timestamp: log.timestamp
        });
      }
    } else if (log.action === 'SEARCH_QUERY') {
       stats.recentSearches.push({
          query: log.details || '',
          resultsCount: -1, // -1 indicates standard search
          timestamp: log.timestamp
       });
    }

    // 4. Conversions (Clicks)
    if (log.action.includes('_CLICK')) {
        conversionMap.set(log.action, (conversionMap.get(log.action) || 0) + 1);
    }
  });

  // Sort and Transform Maps to Arrays
  const sortMap = (map: Map<string, number>) => 
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  stats.topCountries = sortMap(countryMap).slice(0, 5);
  stats.topProfiles = sortMap(profileMap).slice(0, 8);
  stats.topTopics = sortMap(topicMap).slice(0, 8);
  stats.conversionEvents = sortMap(conversionMap);

  // Rebuild dailyActivity sorted chronologically
  const sortedDates = Array.from(dateMap.keys()).sort();
  stats.dailyActivity = sortedDates.slice(-14).map(date => ({
      date,
      count: dateMap.get(date) || 0
  }));

  // Reverse searches to show newest first
  stats.recentSearches.reverse();

  return stats;
};

/**
 * Downloads logs as a CSV file for Marketing Analysis (Excel compatible).
 */
export const downloadLogsAsCsv = () => {
  const logs = getLogs();
  if (logs.length === 0) {
    alert("No activity logs to export.");
    return;
  }

  // Define Headers
  const headers = [
    "ISO Timestamp",
    "US Eastern Time",
    "Action",
    "Details",
    "IP Address",
    "City",
    "State/Region",
    "Country",
    "Device/User Agent",
    "Screen Res"
  ];

  // Map Data
  const rows = logs.map(log => [
    `"${log.timestamp}"`,
    `"${log.easternTime}"`,
    `"${log.action}"`,
    `"${(log.details || '').replace(/"/g, '""')}"`, // Escape quotes
    `"${log.session?.ip || ''}"`,
    `"${log.session?.city || ''}"`,
    `"${log.session?.region || ''}"`,
    `"${log.session?.country || ''}"`,
    `"${(log.session?.userAgent || '').replace(/,/g, ';')}"`, // Simplify UA for CSV
    `"${log.session?.screenSize || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hire_ground_activity_log_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};

/**
 * Downloads logs as JSON for Technical Analysis.
 * Updated to use logFile.json naming as per requirements.
 */
export const downloadLogsAsJson = () => {
  const logs = getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'logFile.json';
  link.click();
};
