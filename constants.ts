
import { VideoEntry } from "./types";

export const APP_VERSION = '1.38';

// The "Single Source of Truth" configuration
export const SHARED_SEED_URL = 'seedData.ts';

/** 
 * Sample used ONLY as a catastrophic fallback if the Master Seed cannot be reached.
 * We keep this small to make it obvious when the Master Seed load has failed.
 */
export const SAMPLE_VIDEOS: VideoEntry[] = [
  {
    "youtubeId": "cu-KodUZ0Fs",
    "title": "Why Data is Still Second-Class (And How to Fix It) - the Hire Ground Podcast featuring Tom Redman",
    "headline": "Join Hire Ground Podcast host Tom Castriota for an eye-opening conversation with Tom Redman, \"The Data Doc\" and President of Data Quality Solutions. With nearly 30 years of experience transforming how organizations think about data quality, Tom reveals why data remains a \"second-class citizen\" in most companies—and why this threatens AI success.",
    "fullDescription": "Join Hire Ground Podcast host Tom Castriota for an eye-opening conversation with Tom Redman, \"The Data Doc\" and President of Data Quality Solutions...",
    "guestName": "Tom Redman",
    "publishedAt": "2025-07-22",
    "guestProfiles": ["Author", "Chief Data Officer", "Data Executive", "CTO"],
    "topics": ["Stakeholder Management", "People And Data", "Organizational Design"],
    "targetAudience": ["Data Professionals", "Technologists", "CEOs"],
    "transcript": "Not Available",
    "spotifyUrl": "https://open.spotify.com/episode/2gp1h9Wllty5l88PDKT6aD",
    "isShort": "N",
    "id": "b49131e1-e31c-48b4-96ca-bea4273690bb",
    "createdAt": 1767460848611
  },
  {
    "youtubeId": "G-jYP8GHUpg",
    "title": "Doug Wald, Executive Recruiter Extraordinaire, joins us on the Pod!",
    "headline": "My college friend, Doug Wald and I chat about his career journey from corporate america at the Software behemoth Computer Associates to the world of executive recruiting.",
    "fullDescription": "Doug offers a wealth of information on how to work with recruiters, interviewing tips, and some insightful advice for experienced and upcoming professionals alike.",
    "guestName": "Doug Wald",
    "publishedAt": "2025-04-09",
    "guestProfiles": ["Executive Recruiter", "Marketing Executive"],
    "topics": ["Interviewing", "Finding A Job", "Networking", "Getting Promoted"],
    "targetAudience": ["Candidates", "Graduates", "Professionals", "Recruiters"],
    "spotifyUrl": "https://open.spotify.com/episode/7o6bSfwOMGpQTgx7CvAJNU",
    "isShort": "N",
    "id": "6484f5b4-d019-4029-aab0-2eab66f63f06",
    "createdAt": 1767460848610
  }
];

export const COMMON_PROFILES = [
  "Salesperson", "Consultant", "Finance Executive", "Student", "Recruiter", "Hiring Manager", "Entrepreneur"
];

export const COMMON_TOPICS = [
  "Interviewing", "Getting A Raise", "Getting Promoted", "Finding A Job", "Networking", "Resume Tips", "Sales", "Leadership"
];
