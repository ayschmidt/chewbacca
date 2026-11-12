const test = require('node:test');
const assert = require('node:assert/strict');
const { extractSkills, canonicalSkill } = require('../lib/skills');
const { normalizeProfile, buildPersona } = require('../lib/persona');
const { scoreJob, jobLevel } = require('../lib/matcher');
const { buildTips, linkedInLinks } = require('../lib/tips');
const { searchJobs } = require('../lib/search');
const { stripHtml } = require('../lib/sources/util');

const raw = {
  name: 'Alex Rivera',
  location: 'São Paulo, Brazil',
  experiences: [
    { title: 'Frontend Engineer', company: 'Cometa', start: '2019-01', current: true,
      description: 'Led migration to React and TypeScript, cutting load time by 42%.' },
  ],
  skills: ['React', 'TypeScript', 'CSS', 'Figma'],
  desiredRoles: ['Senior Frontend Engineer'],
  remotePreference: 'remote',
};

test('extractSkills finds canonical skills and respects word boundaries', () => {
  const s = extractSkills('We use ReactJS, Node and PostgreSQL. Good communication. C++ a plus.');
  assert.ok(s.includes('react'));
  assert.ok(s.includes('sql'));
  assert.ok(s.includes('c++'));
  assert.ok(s.includes('communication'));
  assert.ok(!s.includes('go'), '"good" must not match "go"');
});

test('canonicalSkill maps aliases', () => {
  assert.equal(canonicalSkill('K8s'), 'kubernetes');
  assert.equal(canonicalSkill('Basket weaving'), 'basket weaving');
});

test('normalizeProfile infers skills and years', () => {
  const p = normalizeProfile(raw);
  assert.ok(p.skills.includes('react') && p.skills.includes('figma'));
  assert.ok(p.yearsExperience > 5);
});

test('buildPersona picks an archetype, level and achievements', () => {
  const p = normalizeProfile(raw);
  const persona = buildPersona(p);
  assert.equal(persona.archetype, 'The Code Wizard');
  assert.equal(persona.level, 'senior');
  assert.ok(persona.achievements[0].includes('42%'));
  assert.ok(persona.searchQueries.includes('Senior Frontend Engineer'));
});

test('scoreJob ranks a relevant job above an irrelevant one', () => {
  const p = normalizeProfile(raw);
  const persona = buildPersona(p);
  const good = { title: 'Senior Frontend Engineer', company: 'A', remote: true, location: 'Remote', tags: ['react', 'typescript'], description: 'React, TypeScript, CSS, GraphQL' };
  const bad = { title: 'Registered Nurse', company: 'B', remote: false, location: 'Oslo, Norway', tags: ['patient care'], description: 'Clinical patient care and EHR.' };
  const g = scoreJob(good, p, persona);
  const b = scoreJob(bad, p, persona);
  assert.ok(g.score >= 80, `good score ${g.score}`);
  assert.ok(b.score < 35, `bad score ${b.score}`);
  assert.deepEqual(g.missingSkills, ['graphql']);
});

test('jobLevel detects seniority from title', () => {
  assert.equal(jobLevel({ title: 'Junior Developer' }), 'junior');
  assert.equal(jobLevel({ title: 'Head of Design' }), 'lead');
  assert.equal(jobLevel({ title: 'Sr. Analyst' }), 'senior');
  assert.equal(jobLevel({ title: 'Analyst' }), null);
});

test('buildTips produces specific, company-aware advice', () => {
  const p = normalizeProfile(raw);
  const persona = buildPersona(p);
  const job = { title: 'Frontend Engineer', company: 'Lumen', remote: true, location: 'Remote', tags: ['react', 'graphql'], description: 'Fast-paced startup, data-driven team.' };
  const match = scoreJob(job, p, persona);
  const { tips, headline } = buildTips(job, match, p, persona);
  const text = tips.map((t) => t.text).join(' ');
  assert.ok(headline.length > 0);
  assert.match(text, /React/);
  assert.match(text, /GraphQL/);
  assert.match(text, /42%/);
  assert.match(text, /Lumen/);
  assert.match(linkedInLinks(job, p).people, /linkedin\.com.*Lumen/);
});

test('searchJobs falls back to demo data when every source fails', async () => {
  const fail = async () => { throw new Error('offline'); };
  const fetchers = { remotive: fail, arbeitnow: fail, themuse: fail, remoteok: fail, adzuna: async () => null, jsearch: async () => null };
  const res = await searchJobs(raw, { fetchers });
  assert.equal(res.usedDemo, true);
  assert.ok(res.jobs.length > 10);
  assert.equal(res.sources.adzuna.error, 'not configured');
  assert.equal(res.sources.remotive.ok, false);
  for (let i = 1; i < res.jobs.length; i++) assert.ok(res.jobs[i - 1].match.score >= res.jobs[i].match.score);
  assert.match(res.jobs[0].title, /Frontend/);
});

test('searchJobs uses live results and dedupes', async () => {
  const j = { id: 'x1', title: 'React Developer', company: 'Foo', remote: true, location: 'Remote', url: 'https://example.com', description: 'React', tags: [], source: 'Test' };
  const ok = async () => [j, { ...j, id: 'x2' }];
  const none = async () => null;
  const res = await searchJobs(raw, { fetchers: { remotive: ok, arbeitnow: ok, themuse: none, remoteok: none, adzuna: none, jsearch: none } });
  assert.equal(res.usedDemo, false);
  assert.equal(res.jobs.length, 1);
});

test('stripHtml removes tags and decodes entities', () => {
  assert.equal(stripHtml('<p>Hello &amp; <b>welcome</b></p><script>x()</script>'), 'Hello & welcome');
});
