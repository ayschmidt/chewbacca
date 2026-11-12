// Builds a candidate "persona" from resume-style inputs.
const { CATEGORIES, extractSkills, canonicalSkill, categoryOf, displaySkill } = require('./skills');

const LEVELS = [
  { key: 'entry', label: 'Fresh Talent', max: 1 },
  { key: 'junior', label: 'Rising Star', max: 3 },
  { key: 'mid', label: 'Solid Pro', max: 6 },
  { key: 'senior', label: 'Seasoned Expert', max: 10 },
  { key: 'lead', label: 'Trailblazing Leader', max: Infinity },
];

function list(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

function yearsFromExperiences(experiences) {
  let months = 0;
  const now = new Date();
  for (const e of experiences) {
    const start = parseYearMonth(e.start);
    const end = e.current || !e.end ? now : parseYearMonth(e.end);
    if (start && end && end > start) months += (end - start) / (1000 * 60 * 60 * 24 * 30.44);
  }
  return Math.round((months / 12) * 10) / 10;
}

function parseYearMonth(v) {
  if (!v) return null;
  const m = String(v).match(/(\d{4})(?:[-/](\d{1,2}))?/);
  if (!m) return null;
  return new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1);
}

/** Normalise raw form input into a clean profile object. */
function normalizeProfile(raw = {}) {
  const experiences = (Array.isArray(raw.experiences) ? raw.experiences : [])
    .map((e) => ({
      title: String(e.title || '').trim(),
      company: String(e.company || '').trim(),
      start: e.start || '',
      end: e.end || '',
      current: Boolean(e.current),
      description: String(e.description || '').trim(),
    }))
    .filter((e) => e.title || e.company || e.description);

  const education = (Array.isArray(raw.education) ? raw.education : [])
    .map((e) => ({ degree: String(e.degree || '').trim(), field: String(e.field || '').trim(), school: String(e.school || '').trim() }))
    .filter((e) => e.degree || e.field || e.school);

  // Skills: those typed explicitly + those found in experience text and pasted resume.
  const typed = list(raw.skills).map(canonicalSkill).filter(Boolean);
  const textBlob = [raw.headline, raw.summary, raw.resumeText, ...experiences.map((e) => `${e.title} ${e.description}`)].join('\n');
  const inferred = extractSkills(textBlob);
  const skills = [...new Set([...typed, ...inferred])];

  const statedYears = Number(raw.yearsExperience);
  const yearsExperience = Number.isFinite(statedYears) && statedYears > 0 ? statedYears : yearsFromExperiences(experiences);

  return {
    name: String(raw.name || '').trim(),
    headline: String(raw.headline || '').trim(),
    summary: String(raw.summary || '').trim(),
    location: String(raw.location || '').trim(),
    remotePreference: ['remote', 'hybrid', 'onsite', 'any'].includes(raw.remotePreference) ? raw.remotePreference : 'any',
    openToRelocation: Boolean(raw.openToRelocation),
    yearsExperience,
    desiredRoles: list(raw.desiredRoles),
    industries: list(raw.industries),
    languages: list(raw.languages),
    salaryMin: Number(raw.salaryMin) || 0,
    skills,
    typedSkills: typed,
    experiences,
    education,
    resumeText: String(raw.resumeText || ''),
  };
}

function levelFor(years) {
  return LEVELS.find((l) => years <= l.max) || LEVELS[LEVELS.length - 1];
}

/** Pick out quantified achievements ("grew X by 30%") — the gold for tailored tips. */
function extractAchievements(profile) {
  const text = [profile.resumeText, ...profile.experiences.map((e) => e.description)].join('\n');
  return text
    .split(/[\n•·;]|(?<=\.)\s+/)
    .map((s) => s.replace(/^[-*\s]+/, '').trim())
    .filter((s) => s.length > 15 && s.length < 220 && /\d/.test(s))
    .slice(0, 8);
}

/** Build the persona from a normalised profile. */
function buildPersona(profile) {
  const counts = {};
  for (const s of profile.skills) {
    const c = categoryOf(s);
    if (c === 'soft' || c === 'other') continue;
    counts[c] = (counts[c] || 0) + (profile.typedSkills.includes(s) ? 2 : 1);
  }
  // Desired role and latest title nudge the archetype too.
  const roleText = [...profile.desiredRoles, profile.experiences[0]?.title, profile.headline].join(' ');
  for (const s of extractSkills(roleText, { strict: false })) {
    const c = categoryOf(s);
    if (CATEGORIES[c]) counts[c] = (counts[c] || 0) + 3;
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0]?.[0];
  const secondary = ranked[1]?.[0];
  const def = CATEGORIES[primary] || { archetype: 'The Swiss Army Knife', emoji: '🛠️', tagline: 'Good at a little bit of everything — and a lot of some things.' };

  const level = levelFor(profile.yearsExperience);
  const superpowers = [...profile.typedSkills, ...profile.skills]
    .filter((s, i, arr) => arr.indexOf(s) === i && categoryOf(s) !== 'soft')
    .slice(0, 5);

  const vibes = [];
  if (profile.remotePreference === 'remote') vibes.push('🏝️ Remote-first');
  if (profile.remotePreference === 'hybrid') vibes.push('🔀 Hybrid hero');
  if (profile.remotePreference === 'onsite') vibes.push('🏢 Office energy');
  if (profile.openToRelocation) vibes.push('✈️ Ready to relocate');
  if (profile.languages.length > 1) vibes.push(`🌍 Speaks ${profile.languages.length} languages`);
  if (secondary && CATEGORIES[secondary]) vibes.push(`${CATEGORIES[secondary].emoji} Side quest: ${secondary}`);
  if (profile.experiences.length >= 4) vibes.push('🧭 Well-travelled career');
  const topEdu = profile.education[0];
  if (topEdu) vibes.push(`🎓 ${[topEdu.degree, topEdu.field].filter(Boolean).join(' in ')}`);

  const latest = profile.experiences[0];
  const firstName = profile.name.split(/\s+/)[0] || 'You';
  const wholeYears = Math.floor(profile.yearsExperience);
  const yearsText = wholeYears >= 1 ? `${wholeYears}+ years` : 'fresh energy';
  const bio = `${firstName} is a ${level.label.toLowerCase()} with ${yearsText} of experience`
    + (latest?.title ? `, most recently ${latest.title}${latest.company ? ` at ${latest.company}` : ''}` : '')
    + (superpowers.length ? `. Superpowers: ${superpowers.slice(0, 3).map(displaySkill).join(', ')}.` : '.');

  // Search keywords: desired roles first, then the latest title, then top skills.
  const searchQueries = [...new Set([
    ...profile.desiredRoles,
    latest?.title,
    ...(profile.desiredRoles.length ? [] : superpowers.slice(0, 2)),
  ].filter(Boolean))].slice(0, 4);

  return {
    archetype: def.archetype,
    emoji: def.emoji,
    tagline: def.tagline,
    primaryCategory: primary || 'generalist',
    secondaryCategory: secondary || null,
    level: level.key,
    levelLabel: level.label,
    superpowers,
    vibes,
    bio,
    achievements: extractAchievements(profile),
    searchQueries: searchQueries.length ? searchQueries : ['remote'],
  };
}

module.exports = { normalizeProfile, buildPersona, levelFor, LEVELS };
