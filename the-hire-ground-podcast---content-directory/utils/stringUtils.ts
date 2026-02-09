
export const ACRONYMS = new Set([
  "AI", "CEO", "CTO", "COO", "VP", "VC", "CV", "HR", "IT", "RWE", "MPH", "SEO", "CRM", "DEI", "QA", "SaaS", "B2B", "B2C"
]);

export const toTitleCase = (str: string): string => {
  if (!str) return "";
  
  // Remove extra spaces
  const cleanStr = str.trim().replace(/\s+/g, ' ');
  
  return cleanStr
    .split(" ")
    .map((word) => {
      // Check for punctuation attached to the word (e.g., "CEO,")
      const rawWord = word.replace(/[^a-zA-Z0-9]/g, '');
      const upperWord = rawWord.toUpperCase();
      
      if (ACRONYMS.has(upperWord)) {
        return word.replace(rawWord, upperWord);
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export const normalizeTags = (tags: string[]): string[] => {
  // Deduplicate case-insensitively, preferring the Title Case version
  const uniqueMap = new Map<string, string>();
  
  tags.forEach(tag => {
    const normalized = toTitleCase(tag);
    const key = normalized.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, normalized);
    }
  });
  
  return Array.from(uniqueMap.values()).sort();
};
