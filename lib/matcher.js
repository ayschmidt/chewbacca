// Scores how well a job fits a candidate and explains why.
const { extractSkills, canonicalSkill, categoryOf } = require('./skills');

const STOP = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'at', 'with', 'm', 'f', 'd', 'w',
  'remote', 'hybrid', 'senior', 'junior', 'sr', 'jr', 'lead', 'mid', 'level', 'i', 'ii', 'iii', 'iv', 'new', 'job']);

const LEVEL_ORDER = ['entry', 'junior', 'mid', 'senior', 'lead'];

const WEIGHTS = { skills: 0.45, title: 0.25, seniority: 0.15, location: 0.15 };

function tokens(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t && !STOP.has(t));
}

function jobLevel(job) {
  const t = `${job.title} ${(job.levels || []).join(' ')}`.toLowerCase();
  if (/\b(intern|internship|trainee|graduate|entry)\b/.test(t)) return 'entry';
  if (/\b(junior|jr\.?|associate)\b/.test(t)) return 'junior';
  if (/\b(principal|staff|head|director|vp|chief|lead|manager)\b/.test(t)) return 'lead';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'senior';
  if (/\bmid\b/.test(t)) return 'mid';
  return null;
}

/** Skills a job asks for: from its tags (trusted) and its text (strict extraction). */
function jobSkills(job) {
  const fromTags = (job.tags || []).map(canonicalSkill).filter((s) => categoryOf(s) !== 'other');
  const fromText = extractSkills(`${job.title}\n${job.description}`);
  return [...new Set([...fromTags, ...fromText])];
}

function titleScore(job, profile) {
  const jt = new Set(tokens(job.title));
  if (!jt.size) return 0.5;
  const candidates = [...profile.desiredRoles, ...profile.experiences.map((e) => e.title), profile.headline].filter(Boolean);
  if (!candidates.length) return 0.5;
  let best = 0;
  for (const c of candidates) {
    const ct = new Set(tokens(c));
    if (!ct.size) continue;
    let overlap = 0;
    for (const t of ct) if (jt.has(t)) overlap++;
    // Recall-oriented: how much of what the candidate wants is in the job title.
    const score = overlap / Math.min(ct.size, jt.size);
    best = Math.max(best, score);
  }
  return Math.min(1, best);
}

function seniorityScore(job, persona) {
  const jl = jobLevel(job);
  if (!jl) return 0.8;
  const diff = Math.abs(LEVEL_ORDER.indexOf(jl) - LEVEL_ORDER.indexOf(persona.level));
  return [1, 0.65, 0.3, 0.1, 0.05][diff];
}

function locationScore(job, profile) {
  const pref = profile.remotePreference;
  const loc = String(job.location || '').toLowerCase();
  const here = profile.location.toLowerCase().split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  const sameArea = here.some((h) => h.length > 1 && loc.includes(h));

  if (job.remote) {
    if (pref === 'onsite') return 0.6;
    return 1;
  }
  if (sameArea) return pref === 'remote' ? 0.6 : 1;
  if (profile.openToRelocation) return 0.7;
  if (!loc) return 0.6;
  return pref === 'remote' ? 0.15 : 0.35;
}

/**
 * @returns {{ score:number, breakdown:object, matchedSkills:string[], missingSkills:string[], level:string|null }}
 */
function scoreJob(job, profile, persona) {
  const required = jobSkills(job);
  const mine = new Set(profile.skills);
  const matchedSkills = required.filter((s) => mine.has(s));
  const missingSkills = required.filter((s) => !mine.has(s) && categoryOf(s) !== 'soft');

  // Long descriptions list many "nice to haves"; cap the denominator so one
  // giant posting doesn't punish an otherwise great fit.
  const denom = Math.min(Math.max(required.length, 1), 6);
  const skills = required.length ? Math.min(1, matchedSkills.length / denom) : 0.4;
  const title = titleScore(job, profile);
  const seniority = seniorityScore(job, persona);
  const location = locationScore(job, profile);

  const raw = WEIGHTS.skills * skills + WEIGHTS.title * title + WEIGHTS.seniority * seniority + WEIGHTS.location * location;
  const score = Math.max(3, Math.min(99, Math.round(raw * 100)));

  return {
    score,
    breakdown: {
      skills: Math.round(skills * 100),
      title: Math.round(title * 100),
      seniority: Math.round(seniority * 100),
      location: Math.round(location * 100),
    },
    matchedSkills,
    missingSkills: missingSkills.slice(0, 6),
    level: jobLevel(job),
  };
}

function matchLabel(score) {
  if (score >= 85) return { emoji: '💘', text: 'Soulmate material' };
  if (score >= 70) return { emoji: '🔥', text: 'Serious chemistry' };
  if (score >= 55) return { emoji: '😊', text: 'Worth a first date' };
  if (score >= 40) return { emoji: '🤔', text: 'Could grow on you' };
  return { emoji: '🙃', text: 'Long shot' };
}

module.exports = { scoreJob, jobSkills, jobLevel, matchLabel, tokens, WEIGHTS };
