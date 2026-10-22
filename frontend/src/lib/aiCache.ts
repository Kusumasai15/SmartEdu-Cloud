import fs from "fs";
import path from "path";

export interface CachedAiRecord {
  key: string;
  courseCode: string;
  topic: string;
  mode: string;
  language?: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  source: "GEMINI" | "CHATGPT" | "FACULTY" | "CACHE";
}

// In-memory memory cache for sub-millisecond lookup
const _memoryCache = new Map<string, CachedAiRecord>();

// File storage path on EC2 / container
function getCacheFilePath(): string {
  const customPath = process.env.AI_CACHE_FILE_PATH;
  if (customPath) return customPath;

  const candidateDirs = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), ".next", "cache"),
    "/tmp/smartedu_ai_cache",
    process.cwd(),
  ];

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return path.join(dir, "ai_generations_cache.json");
    } catch {
      // Try next
    }
  }
  return path.join(process.cwd(), "ai_generations_cache.json");
}

let _cacheInitialized = false;

function initFileCache(): void {
  if (_cacheInitialized) return;
  _cacheInitialized = true;
  try {
    const filePath = getCacheFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          _memoryCache.set(k, v as CachedAiRecord);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to read initial AI cache file:", err);
  }
}

function persistCacheToDisk(): void {
  try {
    const filePath = getCacheFilePath();
    const obj: Record<string, CachedAiRecord> = {};
    for (const [k, v] of _memoryCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist AI cache to disk:", err);
  }
}

export function buildAiCacheKey(courseCode: string, mode: string, topic: string, prompt?: string, language: string = "en"): string {
  const cleanCourse = (courseCode || "").trim().toUpperCase().replace(/\s+/g, "");
  const cleanMode = (mode || "").trim().toUpperCase();
  const cleanTopic = (topic || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanLang = (language || "en").trim().toLowerCase();
  
  let promptHash = "";
  if (prompt && prompt.trim()) {
    const p = prompt.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < p.length; i++) {
      hash = ((hash << 5) - hash) + p.charCodeAt(i);
      hash |= 0;
    }
    promptHash = `_${Math.abs(hash).toString(16)}`;
  }
  
  return `${cleanCourse}__${cleanMode}__${cleanTopic}__${cleanLang}${promptHash}`;
}

export async function getCachedAiGeneration(key: string): Promise<CachedAiRecord | null> {
  initFileCache();
  if (_memoryCache.has(key)) {
    return _memoryCache.get(key) || null;
  }
  return null;
}

export async function setCachedAiGeneration(
  key: string,
  data: any,
  meta: {
    courseCode: string;
    topic: string;
    mode: string;
    language?: string;
    source?: "GEMINI" | "CHATGPT" | "FACULTY" | "CACHE";
  }
): Promise<CachedAiRecord> {
  initFileCache();
  const now = new Date().toISOString();
  const existing = _memoryCache.get(key);
  
  const record: CachedAiRecord = {
    key,
    courseCode: meta.courseCode,
    topic: meta.topic,
    mode: meta.mode,
    language: meta.language || "en",
    data,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    source: meta.source || "GEMINI",
  };
  
  _memoryCache.set(key, record);
  persistCacheToDisk();
  return record;
}

export function getAllCachedAiGenerations(): CachedAiRecord[] {
  initFileCache();
  return Array.from(_memoryCache.values());
}
