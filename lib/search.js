// Orchestrates searching every configured source, then scores & enriches results.
const path = require('path');
const fs = require('fs');
const boards = require('./sources/boards');
const { job } = require('./sources/util');
const { normalizeProfile, buildPersona } = require('./persona');
const { scoreJob, matchLabel } = require('./matcher');
const { displaySkill } = require('./skills');
const { buildTips, linkedInLinks } = require('./tips');

const SOURCES = ['remotive', 'arbeitnow', 'themuse', 'remoteok', 'adzuna', 'jsearch'];

let sampleCache;
function sampleJobs() {
  if (!sampleCache) {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sample-jobs.json'), 'utf8'));
    const day = 86400000;
    sampleCache = raw.map((j, i) => job({
      ...j,
      id: `demo-${i}`,
      url: '',
      source: 'Demo',
      postedAt: new Date(Date.now() - ((i * 7) % 20) * day).toISOString(),
    }));
  }
  return sampleCache;
}

function dedupe(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.title || !j.company) return false;
    const key = `${j.title}|${j.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Search for jobs for a raw profile.
 * @param {object} rawProfile
 * @param {{ demo?: boolean, limit?: number, fetchers?: object }} opts
 */
async function searchJobs(rawProfile, { demo = false, limit = 40, fetchers = boards } = {}) {
  const profile = normalizeProfile(rawProfile);
  const persona = buildPersona(profile);
  const queries = persona.searchQueries;

  const status = {};
  let jobs = [];
  if (!demo) {
    const settled = await Promise.allSettled(SOURCES.map((name) => fetchers[name]({ queries, profile, persona })));
    settled.forEach((r, i) => {
      const name = SOURCES[i];
      if (r.status === 'rejected') status[name] = { ok: false, error: String(r.reason?.message || r.reason) };
      else if (r.value === null) status[name] = { ok: false, error: 'not configured' };
      else { status[name] = { ok: true, count: r.value.length }; jobs.push(...r.value); }
    });
  }

  let usedDemo = false;
  if (!jobs.length) {
    jobs = sampleJobs();
    usedDemo = true;
  }

  const enriched = dedupe(jobs).map((j) => {
    const match = scoreJob(j, profile, persona);
    return {
      ...j,
      description: j.description.slice(0, 1200),
      advice: buildTips(j, match, profile, persona),
      match: {
        ...match,
        matchedSkills: match.matchedSkills.map(displaySkill),
        missingSkills: match.missingSkills.map(displaySkill),
        label: matchLabel(match.score),
      },
      linkedin: linkedInLinks(j, profile),
    };
  });

  enriched.sort((a, b) => b.match.score - a.match.score || String(b.postedAt).localeCompare(String(a.postedAt)));

  return { persona: { ...persona, superpowers: persona.superpowers.map(displaySkill) }, profile, jobs: enriched.slice(0, limit), sources: status, usedDemo, queries };
}

module.exports = { searchJobs, sampleJobs, SOURCES };
