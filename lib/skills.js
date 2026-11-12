// Skill dictionary used to extract skills from resumes and job posts.
// Each category maps to a persona archetype; each skill has optional aliases.

const CATEGORIES = {
  engineering: {
    archetype: 'The Code Wizard',
    emoji: '🧙',
    tagline: 'Turns coffee into clean, shippable code.',
    skills: {
      javascript: ['js', 'ecmascript'], typescript: ['ts'], python: [], java: [], 'c#': ['csharp', '.net', 'dotnet'],
      'c++': ['cpp'], go: ['golang'], rust: [], ruby: ['rails', 'ruby on rails'], php: ['laravel'], kotlin: [], swift: ['ios'],
      react: ['react.js', 'reactjs', 'react native'], vue: ['vue.js', 'vuejs'], angular: [], 'node.js': ['node', 'nodejs', 'express'],
      'next.js': ['nextjs'], django: [], flask: [], 'spring': ['spring boot'], graphql: [], 'rest api': ['rest', 'restful', 'apis'],
      html: ['html5'], css: ['css3', 'sass', 'scss', 'tailwind'], aws: ['amazon web services'], azure: [], gcp: ['google cloud'],
      docker: [], kubernetes: ['k8s'], terraform: [], 'ci/cd': ['continuous integration', 'github actions', 'jenkins'],
      linux: [], git: [], microservices: [], android: [], 'mobile development': ['mobile'], devops: ['sre'], security: ['cybersecurity', 'infosec'],
      testing: ['qa', 'unit testing', 'test automation', 'cypress', 'jest', 'selenium'],
    },
  },
  data: {
    archetype: 'The Data Whisperer',
    emoji: '🔮',
    tagline: 'Hears what the numbers are really saying.',
    skills: {
      sql: ['postgres', 'postgresql', 'mysql'], 'machine learning': ['ml'], 'deep learning': ['neural networks', 'pytorch', 'tensorflow'],
      'data analysis': ['data analytics', 'analytics'], statistics: ['statistical'], 'data visualization': ['tableau', 'power bi', 'looker'],
      'data engineering': ['etl', 'airflow', 'dbt', 'data pipelines'], spark: ['pyspark'], pandas: ['numpy'], r: [],
      'llm': ['large language models', 'generative ai', 'genai', 'nlp'], 'a/b testing': ['experimentation'], excel: ['spreadsheets'],
      snowflake: ['bigquery', 'redshift', 'data warehouse'],
    },
  },
  design: {
    archetype: 'The Pixel Poet',
    emoji: '🎨',
    tagline: 'Makes things people actually love to use.',
    skills: {
      figma: ['sketch'], 'ux design': ['ux', 'user experience'], 'ui design': ['ui', 'interface design', 'visual design'],
      'user research': ['usability testing'], prototyping: ['wireframing', 'wireframes'], 'design systems': [],
      illustration: [], 'graphic design': ['adobe', 'photoshop', 'illustrator', 'indesign'], 'motion design': ['animation', 'after effects'],
      accessibility: ['a11y', 'wcag'], branding: ['brand design'],
    },
  },
  product: {
    archetype: 'The Product Visionary',
    emoji: '🚀',
    tagline: 'Sees the roadmap three quarters ahead.',
    skills: {
      'product management': ['product manager', 'product owner'], roadmapping: ['roadmap', 'product strategy'], agile: ['scrum', 'kanban'],
      'stakeholder management': ['stakeholders'], jira: ['confluence'], 'go-to-market': ['gtm', 'product launch'],
      'requirements gathering': ['user stories', 'prd'], okrs: ['kpis'],
    },
  },
  marketing: {
    archetype: 'The Growth Hacker',
    emoji: '📣',
    tagline: 'Makes the right people care, fast.',
    skills: {
      seo: ['search engine optimization'], sem: ['google ads', 'ppc', 'paid search'], 'content marketing': ['content strategy', 'copywriting'],
      'social media': ['instagram', 'tiktok', 'community management'], 'email marketing': ['hubspot', 'mailchimp', 'klaviyo'],
      'growth marketing': ['growth', 'demand generation', 'lead generation'], 'marketing analytics': ['google analytics', 'ga4'],
      'brand marketing': ['brand strategy'], 'public relations': ['pr', 'communications'], 'performance marketing': ['paid social', 'meta ads'],
    },
  },
  sales: {
    archetype: 'The Deal Closer',
    emoji: '🤝',
    tagline: 'Turns cold intros into warm partnerships.',
    skills: {
      'b2b sales': ['saas sales', 'enterprise sales'], 'account management': ['account manager', 'key accounts'], salesforce: ['crm'],
      negotiation: [], 'business development': ['bizdev', 'partnerships'], prospecting: ['cold calling', 'outbound'],
      'customer success': ['customer experience', 'client success'], 'customer support': ['customer service', 'zendesk'],
    },
  },
  operations: {
    archetype: 'The Ops Maestro',
    emoji: '🎼',
    tagline: 'Keeps every moving part in perfect rhythm.',
    skills: {
      'project management': ['pmp', 'project manager', 'program management'], operations: ['business operations'],
      'supply chain': ['logistics', 'procurement'], 'process improvement': ['lean', 'six sigma', 'kaizen'],
      'vendor management': [], erp: ['sap', 'netsuite'],
    },
  },
  finance: {
    archetype: 'The Numbers Ninja',
    emoji: '🥷',
    tagline: 'Spots the decimal that changes everything.',
    skills: {
      accounting: ['gaap', 'ifrs', 'bookkeeping'], 'financial modeling': ['financial analysis', 'valuation', 'fp&a'],
      budgeting: ['forecasting'], audit: ['auditing', 'compliance'], tax: [], risk: ['risk management'], quickbooks: [],
    },
  },
  people: {
    archetype: 'The Talent Magnet',
    emoji: '🧲',
    tagline: 'Builds teams people never want to leave.',
    skills: {
      recruiting: ['talent acquisition', 'sourcing', 'recruiter'], 'human resources': ['hr', 'hrbp', 'people operations'],
      'employee relations': [], onboarding: [], 'learning and development': ['l&d', 'training'], 'compensation': ['benefits', 'payroll'],
      leadership: ['people management', 'team lead', 'managed a team', 'mentoring', 'coaching'],
    },
  },
  healthcare: {
    archetype: 'The Care Champion',
    emoji: '🩺',
    tagline: 'Puts people’s wellbeing at the center of everything.',
    skills: {
      'patient care': ['nursing', 'clinical'], 'healthcare administration': ['hipaa', 'ehr', 'emr'], pharmacy: [],
      'medical research': ['clinical trials'], 'mental health': ['counseling', 'therapy'],
    },
  },
  education: {
    archetype: 'The Knowledge Spark',
    emoji: '✨',
    tagline: 'Lights up lightbulbs in other people’s heads.',
    skills: {
      teaching: ['teacher', 'instruction', 'tutoring'], 'curriculum design': ['curriculum', 'instructional design', 'e-learning'],
      'public speaking': ['presentations', 'workshops'], writing: ['technical writing', 'editing', 'documentation'],
    },
  },
};

const SOFT_SKILLS = ['communication', 'teamwork', 'collaboration', 'problem solving', 'leadership', 'creativity',
  'adaptability', 'time management', 'critical thinking', 'english', 'spanish', 'portuguese', 'french', 'german'];

// Build a flat lookup: alias -> { skill, category }
const LOOKUP = new Map();
for (const [category, def] of Object.entries(CATEGORIES)) {
  for (const [skill, aliases] of Object.entries(def.skills)) {
    LOOKUP.set(skill, { skill, category });
    for (const a of aliases) if (!LOOKUP.has(a)) LOOKUP.set(a, { skill, category });
  }
}
for (const s of SOFT_SKILLS) if (!LOOKUP.has(s)) LOOKUP.set(s, { skill: s, category: 'soft' });

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compile a matcher for each alias. Word boundaries are emulated so that
// "go" doesn't match "good" and "c++" still matches.
const PATTERNS = [...LOOKUP.entries()]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([alias, info]) => ({
    alias,
    info,
    re: new RegExp(`(^|[^a-z0-9+#])${escapeRegex(alias)}(?=$|[^a-z0-9+#])`, 'i'),
  }));

// Very short aliases are ambiguous in free text ("r", "go", "pr", "ui"); only
// accept them when they come from an explicit list (candidate input or job tags).
const AMBIGUOUS = new Set(['r', 'go', 'pr', 'ui', 'ux', 'ts', 'js', 'ml', 'hr', 'qa', 'tax', 'risk', 'growth', 'node', 'rest', 'crm', 'mobile', 'clinical', 'apis']);

/**
 * Extract canonical skills from free text.
 * @param {string} text
 * @param {{strict?: boolean}} opts strict=true skips ambiguous short aliases.
 * @returns {string[]} canonical skill names
 */
function extractSkills(text, { strict = true } = {}) {
  if (!text) return [];
  const lower = ` ${String(text).toLowerCase()} `;
  const found = new Set();
  for (const { alias, info, re } of PATTERNS) {
    if (strict && AMBIGUOUS.has(alias)) continue;
    if (re.test(lower)) found.add(info.skill);
  }
  return [...found];
}

/** Normalise a user-typed skill to its canonical name (or keep it as-is). */
function canonicalSkill(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  const hit = LOOKUP.get(s);
  return hit ? hit.skill : s;
}

function categoryOf(skill) {
  const hit = LOOKUP.get(String(skill).toLowerCase());
  return hit ? hit.category : 'other';
}

const DISPLAY = {
  javascript: 'JavaScript', typescript: 'TypeScript', graphql: 'GraphQL', 'node.js': 'Node.js', 'next.js': 'Next.js',
  html: 'HTML', css: 'CSS', sql: 'SQL', aws: 'AWS', gcp: 'GCP', php: 'PHP', 'c#': 'C#', 'c++': 'C++', 'rest api': 'REST API',
  'ci/cd': 'CI/CD', seo: 'SEO', sem: 'SEM', llm: 'LLMs', okrs: 'OKRs', erp: 'ERP', 'a/b testing': 'A/B Testing',
  'ux design': 'UX Design', 'ui design': 'UI Design', ios: 'iOS', devops: 'DevOps', 'go-to-market': 'Go-to-Market', r: 'R',
};

/** Human-friendly label for a canonical skill. */
function displaySkill(skill) {
  const s = String(skill || '');
  return DISPLAY[s.toLowerCase()] || s.replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { CATEGORIES, SOFT_SKILLS, extractSkills, canonicalSkill, categoryOf, displaySkill };
