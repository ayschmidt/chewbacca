// Adapters for public job boards. Each returns a list of normalised jobs.
// Free/no-key: Remotive, Arbeitnow, The Muse, RemoteOK.
// Keyed (optional): Adzuna (ADZUNA_APP_ID/ADZUNA_APP_KEY) and JSearch via RapidAPI (RAPIDAPI_KEY),
// which aggregates listings from LinkedIn, Indeed, Glassdoor and others.
const { getJSON, matchesQueries, job, settleAll } = require('./util');

const enc = encodeURIComponent;

async function remotive({ queries }) {
  const results = await settleAll(queries.slice(0, 3).map((q) =>
    getJSON(`https://remotive.com/api/remote-jobs?search=${enc(q)}&limit=40`)));
  return results.flatMap((r) => r.jobs || []).map((j) => job({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || 'Remote',
    remote: true,
    url: j.url,
    description: j.description,
    tags: [...(j.tags || []), j.category].filter(Boolean),
    salary: j.salary || '',
    postedAt: j.publication_date,
    source: 'Remotive',
    logo: j.company_logo || '',
  }));
}

async function arbeitnow({ queries }) {
  const pages = await settleAll([1, 2].map((p) =>
    getJSON(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)));
  return pages.flatMap((r) => r.data || []).map((j) => job({
    id: `arbeitnow-${j.slug}`,
    title: j.title,
    company: j.company_name,
    location: j.location,
    remote: Boolean(j.remote),
    url: j.url,
    description: j.description,
    tags: j.tags || [],
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : '',
    source: 'Arbeitnow',
  })).filter((j) => matchesQueries(j, queries));
}

async function themuse({ queries, persona }) {
  const levelMap = { entry: 'Entry Level', junior: 'Entry Level', mid: 'Mid Level', senior: 'Senior Level', lead: 'Management' };
  const level = levelMap[persona.level];
  const pages = await settleAll([0, 1, 2].map((p) =>
    getJSON(`https://www.themuse.com/api/public/jobs?page=${p}&descending=true${level ? `&level=${enc(level)}` : ''}`)));
  return pages.flatMap((r) => r.results || []).map((j) => {
    const locs = (j.locations || []).map((l) => l.name);
    return job({
      id: `muse-${j.id}`,
      title: j.name,
      company: j.company?.name,
      location: locs.join(' · '),
      remote: locs.some((l) => /remote|flexible/i.test(l)),
      url: j.refs?.landing_page,
      description: j.contents,
      tags: (j.categories || []).map((c) => c.name),
      levels: (j.levels || []).map((l) => l.name),
      postedAt: j.publication_date,
      source: 'The Muse',
    });
  }).filter((j) => matchesQueries(j, queries));
}

async function remoteok({ queries }) {
  const data = await getJSON('https://remoteok.com/api');
  return (Array.isArray(data) ? data.slice(1) : []).map((j) => job({
    id: `remoteok-${j.id}`,
    title: j.position,
    company: j.company,
    location: j.location || 'Remote',
    remote: true,
    url: j.url || j.apply_url,
    description: j.description,
    tags: j.tags || [],
    salary: j.salary_min ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round((j.salary_max || j.salary_min) / 1000)}k` : '',
    postedAt: j.date,
    source: 'RemoteOK',
    logo: j.company_logo || j.logo || '',
  })).filter((j) => matchesQueries(j, queries));
}

async function adzuna({ queries, profile }) {
  const { ADZUNA_APP_ID: id, ADZUNA_APP_KEY: key, ADZUNA_COUNTRY: country = 'us' } = process.env;
  if (!id || !key) return null; // not configured
  const where = profile.remotePreference === 'remote' ? '' : profile.location;
  const results = await settleAll(queries.slice(0, 3).map((q) =>
    getJSON(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${enc(id)}&app_key=${enc(key)}&results_per_page=30&what=${enc(q)}${where ? `&where=${enc(where)}` : ''}&content-type=application/json`)));
  return results.flatMap((r) => r.results || []).map((j) => job({
    id: `adzuna-${j.id}`,
    title: j.title,
    company: j.company?.display_name,
    location: j.location?.display_name,
    remote: /remote/i.test(`${j.title} ${j.description}`),
    url: j.redirect_url,
    description: j.description,
    tags: [j.category?.label].filter(Boolean),
    salary: j.salary_min ? `${Math.round(j.salary_min / 1000)}k–${Math.round((j.salary_max || j.salary_min) / 1000)}k` : '',
    postedAt: j.created,
    source: 'Adzuna',
  }));
}

async function jsearch({ queries, profile }) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null; // not configured
  const headers = { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' };
  const where = profile.remotePreference === 'remote' ? 'remote' : profile.location;
  const results = await settleAll(queries.slice(0, 2).map((q) =>
    getJSON(`https://jsearch.p.rapidapi.com/search?query=${enc(`${q}${where ? ` in ${where}` : ''}`)}&num_pages=1${profile.remotePreference === 'remote' ? '&remote_jobs_only=true' : ''}`, { headers, timeoutMs: 15000 })));
  return results.flatMap((r) => r.data || []).map((j) => job({
    id: `jsearch-${j.job_id}`,
    title: j.job_title,
    company: j.employer_name,
    location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', '),
    remote: Boolean(j.job_is_remote),
    url: j.job_apply_link,
    description: j.job_description,
    tags: j.job_required_skills || [],
    salary: j.job_min_salary ? `${Math.round(j.job_min_salary / 1000)}k–${Math.round((j.job_max_salary || j.job_min_salary) / 1000)}k` : '',
    postedAt: j.job_posted_at_datetime_utc,
    // JSearch tells us where the listing came from, e.g. "LinkedIn", "Indeed".
    source: j.job_publisher ? `${j.job_publisher} (via JSearch)` : 'JSearch',
    logo: j.employer_logo || '',
  }));
}

module.exports = { remotive, arbeitnow, themuse, remoteok, adzuna, jsearch };
