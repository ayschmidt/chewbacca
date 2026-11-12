// Generates tailored, company-specific application tips.
const { displaySkill } = require('./skills');

const CULTURE_SIGNALS = [
  { re: /fast[- ]paced|startup|scrappy|wear many hats|ambiguity/i, tip: (c) => `${c} moves fast. Pick one story where you shipped something quickly with very little guidance, and open with it.` },
  { re: /mission|impact|purpose|change the world|make a difference/i, tip: (c) => `${c} is mission-driven. Add a line to your cover note about why their mission matters to you personally. Keep it real and keep it short.` },
  { re: /collaborat|cross[- ]functional|team player|partner with/i, tip: () => 'They mention cross-functional work a lot. Name the teams you have partnered with, like "worked with Design, Sales & Legal".' },
  { re: /customer[- ]obsess|customer[- ]centric|customer[- ]first|user[- ]centric/i, tip: () => 'They are customer-obsessed. Frame at least one achievement as an outcome for customers or users, not just for your team.' },
  { re: /data[- ]driven|metrics|kpi|measur/i, tip: () => 'They are data-driven. Put a number on every bullet you can: %, $, users, hours saved.' },
  { re: /ownership|self[- ]starter|autonom|independent/i, tip: () => 'They value ownership. Use "I led", "I owned" and "I drove" instead of "helped with".' },
  { re: /divers|inclusi|belong/i, tip: () => 'Inclusion matters to them. If you have mentored people, led an ERG or built accessible products, mention it.' },
  { re: /remote[- ]first|async|distributed/i, tip: () => 'They are remote-first. Show you can work async: written docs, timezone-friendly habits, self-management.' },
  { re: /learn|growth mindset|curious|curiosity/i, tip: () => 'They hire for curiosity. Mention something you taught yourself recently.' },
  { re: /open[- ]source|github/i, tip: () => 'They like open source. Link your GitHub or a public project near the top of your resume.' },
];

const title = displaySkill;

function pickAchievement(achievements, skills) {
  if (!achievements?.length) return null;
  const withSkill = achievements.find((a) => skills.some((s) => a.toLowerCase().includes(s)));
  return withSkill || achievements[0];
}

/**
 * @param {object} job normalised job
 * @param {object} match result from scoreJob
 * @param {object} profile normalised profile
 * @param {object} persona persona
 * @returns {{ headline:string, tips:{icon:string,text:string}[] }}
 */
function buildTips(job, match, profile, persona) {
  const tips = [];
  const company = job.company || 'This company';

  if (match.matchedSkills.length) {
    const top = match.matchedSkills.slice(0, 3).map(title).join(', ');
    tips.push({ icon: '🎯', text: `They want ${top}, and you've got it. Put these in your first resume bullet and in the first two lines of your summary.` });
  }

  const achievement = pickAchievement(persona.achievements, match.matchedSkills);
  if (achievement) {
    tips.push({ icon: '🏆', text: `Lead with your proof: "${achievement.length > 140 ? achievement.slice(0, 137) + '…' : achievement}". Put it on top of your most relevant role.` });
  } else {
    tips.push({ icon: '📈', text: 'Add numbers to your bullets: team size, % growth, time saved, revenue. Numbers are what recruiters remember.' });
  }

  if (match.missingSkills.length) {
    const gap = match.missingSkills.slice(0, 2).map(title).join(' and ');
    tips.push({ icon: '🧩', text: `Gap alert: ${gap}. If you've used them at all, even in side projects, list them. If not, point to the closest thing you know and say you're ramping up.` });
  }

  tips.push({ icon: '🪞', text: `Mirror their wording. Make your resume headline "${job.title}" (or close to it) so keyword filters and recruiters can tell at a glance.` });

  if (match.level && match.level !== persona.level) {
    const order = ['entry', 'junior', 'mid', 'senior', 'lead'];
    const up = order.indexOf(match.level) > order.indexOf(persona.level);
    tips.push(up
      ? { icon: '🪜', text: 'This role is a step up. Bring examples of when you already worked at that level: led a project, mentored someone, owned a decision.' }
      : { icon: '🧘', text: 'You may be more experienced than this role asks. Say why it excites you so they don\'t worry you\'ll get bored.' });
  }

  const text = `${job.title} ${job.description}`;
  const culture = CULTURE_SIGNALS.filter((c) => c.re.test(text)).slice(0, 2);
  for (const c of culture) tips.push({ icon: '💬', text: c.tip(company) });

  if (job.remote && profile.remotePreference !== 'onsite') {
    tips.push({ icon: '🏝️', text: 'Remote role: say that you have worked remotely before and mention the tools you used (Slack, Notion, Loom…).' });
  } else if (!job.remote && profile.location && job.location && !job.location.toLowerCase().includes(profile.location.toLowerCase().split(',')[0])) {
    tips.push({ icon: '✈️', text: profile.openToRelocation
      ? `It's in ${job.location}. State clearly that you're open to relocating so it doesn't count against you.`
      : `It's in ${job.location}. Check whether they accept hybrid or remote before you invest time.` });
  }

  tips.push({ icon: '🤝', text: `Find someone at ${company} on LinkedIn (a recruiter or a future teammate) and send a short, specific note before or right after you apply.` });

  const headline = match.score >= 70
    ? `You and ${company} have real chemistry. Here's how to seal the deal:`
    : match.score >= 50
      ? `There's a spark here. Use these to fan it into a flame:`
      : `Long shot, but you never know. Here's how to improve your odds:`;

  return { headline, tips: tips.slice(0, 7) };
}

function linkedInLinks(job, profile) {
  const enc = encodeURIComponent;
  const loc = job.remote ? '' : (job.location || profile.location || '');
  return {
    similarJobs: `https://www.linkedin.com/jobs/search/?keywords=${enc(`${job.title} ${job.company}`.trim())}${loc ? `&location=${enc(loc)}` : ''}`,
    company: `https://www.linkedin.com/search/results/companies/?keywords=${enc(job.company || '')}`,
    people: `https://www.linkedin.com/search/results/people/?keywords=${enc(`${job.company} recruiter`)}`,
  };
}

module.exports = { buildTips, linkedInLinks };
