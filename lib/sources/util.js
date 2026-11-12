// Shared helpers for job-source adapters.

const UA = 'JobCrush/1.0 (job matching app)';

async function getJSON(url, { headers = {}, timeoutMs = 9000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

function stripHtml(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|div|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(parseInt(e.slice(1), 10) || 32) : m))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Does a job look relevant to any of the search queries? (for sources without server-side search) */
function matchesQueries(job, queries) {
  if (!queries?.length) return true;
  const hay = `${job.title} ${(job.tags || []).join(' ')}`.toLowerCase();
  return queries.some((q) => q.toLowerCase().split(/\s+/).filter((w) => w.length > 2).some((w) => hay.includes(w)));
}

function job(fields) {
  return {
    id: '', title: '', company: '', location: '', remote: false, url: '', description: '', tags: [],
    salary: '', postedAt: '', source: '', logo: '', levels: [],
    ...fields,
    description: stripHtml(fields.description).slice(0, 6000),
  };
}

/** Run requests in parallel; fail only if *every* request failed. */
async function settleAll(promises) {
  const results = await Promise.allSettled(promises);
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length && results.length) throw results[0].reason;
  return ok;
}

module.exports = { settleAll, getJSON, stripHtml, matchesQueries, job };
