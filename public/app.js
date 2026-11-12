/* JobCrush client: vanilla JS single-page app. */
(() => {
  'use strict';

  // ---------- tiny utils ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
  const store = {
    get(k, d) { try { const v = localStorage.getItem(`jobcrush:${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`jobcrush:${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(`jobcrush:${k}`); } catch { /* noop */ } },
  };
  const app = $('#app');

  async function api(path, body) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- state ----------
  const EMPTY_DRAFT = {
    name: '', headline: '', location: '', resumeText: '',
    experiences: [{ title: '', company: '', start: '', end: '', current: true, description: '' }],
    skills: [], languages: [],
    education: [{ degree: '', field: '', school: '' }],
    desiredRoles: [], remotePreference: 'any', openToRelocation: false, yearsExperience: '', industries: [], salaryMin: '',
  };

  const state = {
    draft: store.get('draft', structuredClone(EMPTY_DRAFT)),
    step: store.get('step', 0),
    persona: store.get('persona', null),
    feed: store.get('feed', null), // { jobs, usedDemo, sources }
    index: store.get('index', 0),
    liked: store.get('liked', {}), // id -> { job, super, at }
    history: store.get('history', []), // [{ id, action }]
  };
  const save = () => {
    store.set('draft', state.draft); store.set('step', state.step); store.set('persona', state.persona);
    store.set('feed', state.feed); store.set('index', state.index); store.set('liked', state.liked); store.set('history', state.history);
    updateBadge();
  };

  const DEMO_PROFILE = {
    name: 'Alex Rivera',
    headline: 'Frontend engineer who loves delightful, accessible UIs',
    location: 'São Paulo, Brazil',
    resumeText: '',
    experiences: [
      { title: 'Frontend Engineer', company: 'Cometa Pay', start: '2021-03', end: '', current: true,
        description: 'Led migration of the checkout to React + TypeScript, cutting load time by 42%.\nBuilt a design system with Figma and Storybook used by 5 squads.\nMentored 3 junior developers and ran our accessibility guild.' },
      { title: 'Web Developer', company: 'Agência Nuvem', start: '2018-06', end: '2021-02', current: false,
        description: 'Shipped 30+ marketing sites in JavaScript, HTML and CSS.\nIntroduced Jest and Cypress testing, reducing production bugs by 35%.' },
    ],
    skills: ['react', 'typescript', 'javascript', 'css', 'figma', 'accessibility', 'node.js', 'testing'],
    languages: ['Portuguese', 'English', 'Spanish'],
    education: [{ degree: 'BSc', field: 'Computer Science', school: 'Universidade de São Paulo' }],
    desiredRoles: ['Senior Frontend Engineer', 'Full Stack Developer'],
    remotePreference: 'remote', openToRelocation: false, yearsExperience: '', industries: ['Fintech', 'SaaS'], salaryMin: '',
  };

  const POPULAR_SKILLS = ['JavaScript', 'Python', 'SQL', 'React', 'Excel', 'Figma', 'Project Management', 'Communication',
    'Leadership', 'Data Analysis', 'Salesforce', 'SEO', 'AWS', 'Customer Success', 'Agile', 'Content Marketing'];

  // ---------- router ----------
  const routes = { '': renderWelcome, profile: renderWizard, persona: renderPersona, swipe: renderSwipe, matches: renderMatches, loading: renderLoading };

  function route() {
    const name = location.hash.replace(/^#\/?/, '').split('?')[0];
    const fn = routes[name] || renderWelcome;
    $('#tabbar').hidden = !state.persona || name === '';
    $$('#tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
    window.scrollTo(0, 0);
    app.classList.toggle('swipe-mode', name === 'swipe');
    fn();
    app.focus({ preventScroll: true });
  }
  const go = (r) => { if (location.hash === `#/${r}`) route(); else location.hash = `#/${r}`; };
  window.addEventListener('hashchange', route);

  function updateBadge() {
    const n = Object.keys(state.liked).length;
    const b = $('#matchCount');
    b.hidden = !n;
    b.textContent = n;
  }

  // ---------- theme ----------
  (function initTheme() {
    const saved = store.get('theme', null);
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = $('#themeToggle');
    const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    const sync = () => { btn.textContent = isDark() ? '☀️' : '🌙'; };
    sync();
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
      sync();
    });
  })();

  // ======================================================================
  // Welcome
  // ======================================================================
  function renderWelcome() {
    const returning = Boolean(state.persona);
    app.innerHTML = `
      <section class="hero">
        <div class="floaty" aria-hidden="true">
          <div class="mini"><div class="ring" style="--p:62;background:conic-gradient(var(--brand-secondary) 62%, var(--surface-2) 0)"><b>62%</b></div><b>Data Analyst</b><small>Not quite your type</small></div>
          <div class="mini"><div class="ring" style="--p:78;background:conic-gradient(var(--brand-fresh) 78%, var(--surface-2) 0)"><b>78%</b></div><b>Product Designer</b><small>Serious chemistry 🔥</small></div>
          <div class="mini"><div class="ring" style="--p:94;background:conic-gradient(var(--brand-primary) 94%, var(--surface-2) 0)"><b>94%</b></div><b>Your dream job</b><small>Soulmate material 💘</small></div>
        </div>
        <h1>Swipe right on <span class="grad">your future</span></h1>
        <p class="kicker-line"><em>connecting</em> great people <em>with brands</em> worth joining</p>
        <p class="lead">Tell us your story. We'll build your career persona, look through the job boards, and show you the roles you're a real match for, with tips to win each one.</p>
        <div class="cta">
          ${returning
            ? `<a class="btn" href="#/swipe">🔥 Keep swiping</a><a class="btn ghost" href="#/profile">✏️ Edit my profile</a>`
            : `<a class="btn" href="#/profile">💘 Find my match</a><button class="btn ghost" id="demoBtn">👀 Try a demo profile</button>`}
        </div>
      </section>
      <section class="how">
        <div><span>📝</span><strong>Spill the tea</strong><p>Fill in what you'd put on a resume, or paste the whole thing.</p></div>
        <div><span>🪪</span><strong>Meet your persona</strong><p>We work out your superpowers, level and career vibe.</p></div>
        <div><span>🔥</span><strong>Swipe & shine</strong><p>See your match % for every job and tips to stand out.</p></div>
      </section>`;
    $('#demoBtn')?.addEventListener('click', () => {
      state.draft = structuredClone(DEMO_PROFILE);
      state.step = 0;
      save();
      toast('Meet Alex! Feel free to tweak anything ✨');
      go('profile');
    });
  }

  // ======================================================================
  // Profile wizard
  // ======================================================================
  const STEPS = [
    { kicker: 'Step 1 · The basics', title: 'First things first: who are you? 👋', render: stepBasics },
    { kicker: 'Step 2 · Your story', title: 'Where have you made magic? ✨', render: stepExperience },
    { kicker: 'Step 3 · Superpowers', title: 'What are you great at? 💪', render: stepSkills },
    { kicker: 'Step 4 · Brains', title: 'Where did you level up? 🎓', render: stepEducation },
    { kicker: 'Step 5 · Your type', title: 'Describe your dream match 💭', render: stepPreferences },
  ];

  function renderWizard() {
    const step = Math.min(state.step, STEPS.length - 1);
    const s = STEPS[step];
    app.innerHTML = `
      <div class="progress" aria-label="Step ${step + 1} of ${STEPS.length}">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="step-kicker">${s.kicker}</div>
      <h2>${s.title}</h2>
      <form class="card" id="wizard" novalidate>${s.render()}</form>
      <div class="wizard-nav">
        <button class="btn ghost" id="back" ${step === 0 ? 'hidden' : ''}>← Back</button>
        <span></span>
        <button class="btn" id="next">${step === STEPS.length - 1 ? '🪄 Reveal my persona' : 'Next →'}</button>
      </div>`;

    const form = $('#wizard');
    form.addEventListener('input', (e) => bindInput(e.target));
    form.addEventListener('change', (e) => bindInput(e.target));
    form.addEventListener('submit', (e) => e.preventDefault());
    wireRepeaters(form);
    wireChipInputs(form);
    if (step === 2) suggestSkills();

    $('#back').addEventListener('click', () => { state.step = step - 1; save(); renderWizard(); });
    $('#next').addEventListener('click', async () => {
      flushChipInputs(form);
      if (step === 0 && !state.draft.name.trim()) { toast('We need at least a name to call you by 😊'); $('[name=name]').focus(); return; }
      if (step < STEPS.length - 1) { state.step = step + 1; save(); renderWizard(); return; }
      const btn = $('#next');
      btn.disabled = true; btn.textContent = 'Reading your stars… 🔮';
      try {
        const { persona } = await api('/api/persona', state.draft);
        state.persona = persona;
        state.feed = null; state.index = 0; state.history = [];
        save();
        go('persona');
      } catch (err) {
        toast(`Oops: ${err.message}`);
        btn.disabled = false; btn.textContent = '🪄 Reveal my persona';
      }
    });
  }

  // Data binding: name="path.to.field" or name="experiences.0.title"
  function bindInput(el) {
    if (!el.name || el.dataset.chip !== undefined) return;
    const parts = el.name.split('.');
    let obj = state.draft;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    const key = parts[parts.length - 1];
    obj[key] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'checkbox' && key === 'current') {
      const end = el.closest('.repeater-item')?.querySelector('[name$=".end"]');
      if (end) end.disabled = el.checked;
    }
    save();
  }

  const field = (name, label, { type = 'text', placeholder = '', hint = '', value } = {}) => {
    const v = value ?? name.split('.').reduce((o, k) => o?.[k], state.draft) ?? '';
    const id = `f-${name.replace(/\./g, '-')}`;
    const input = type === 'textarea'
      ? `<textarea id="${id}" name="${name}" placeholder="${esc(placeholder)}">${esc(v)}</textarea>`
      : `<input id="${id}" type="${type}" name="${name}" value="${esc(v)}" placeholder="${esc(placeholder)}" />`;
    return `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
  };

  const chipField = (name, label, placeholder, hint = '') => `
    <div class="field">
      <label for="chip-${name}">${label}</label>
      <div class="chip-input" data-list="${name}">
        ${(state.draft[name] || []).map((v, i) => `<span class="chip">${esc(v)}<button type="button" data-remove="${i}" aria-label="Remove ${esc(v)}">×</button></span>`).join('')}
        <input id="chip-${name}" data-chip placeholder="${esc(placeholder)}" />
      </div>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
    </div>`;

  function stepBasics() {
    return `
      ${field('name', 'Your name', { placeholder: 'e.g. Alex Rivera' })}
      ${field('headline', 'Your headline', { placeholder: 'e.g. Marketing whiz with a soft spot for data', hint: 'One line that sums you up, like the top of your resume.' })}
      ${field('location', 'Where are you based?', { placeholder: 'City, Country' })}
      <details class="lazy" ${state.draft.resumeText ? 'open' : ''}>
        <summary>🦥 Lazy mode: paste your whole resume</summary>
        <p class="hint">We'll pick out skills and quantified achievements automatically. You can still fill in the next steps for better matches.</p>
        ${field('resumeText', 'Resume text', { type: 'textarea', placeholder: 'Paste your resume or LinkedIn "About" + experience here…' })}
      </details>`;
  }

  function stepExperience() {
    return `
      <p class="hint" style="margin-top:0">Most recent first. Add achievements with numbers ("grew signups 40%"): we use them to write your tips.</p>
      <div data-repeater="experiences">
        ${state.draft.experiences.map((e, i) => `
          <div class="repeater-item">
            ${state.draft.experiences.length > 1 ? `<button type="button" class="remove" data-remove-item="${i}" aria-label="Remove role">✕</button>` : ''}
            <div class="row">
              ${field(`experiences.${i}.title`, 'Job title', { placeholder: 'e.g. Product Designer' })}
              ${field(`experiences.${i}.company`, 'Company', { placeholder: 'e.g. Acme Inc.' })}
            </div>
            <div class="row">
              ${field(`experiences.${i}.start`, 'Started', { type: 'month' })}
              <div class="field"><label for="f-experiences-${i}-end">Ended</label>
                <input id="f-experiences-${i}-end" type="month" name="experiences.${i}.end" value="${esc(e.end)}" ${e.current ? 'disabled' : ''} />
                <label class="check"><input type="checkbox" name="experiences.${i}.current" ${e.current ? 'checked' : ''} /> I work here now</label>
              </div>
            </div>
            ${field(`experiences.${i}.description`, 'What did you rock at?', { type: 'textarea', placeholder: '• Led X, resulting in Y%\n• Built Z used by N people' })}
          </div>`).join('')}
      </div>
      <button type="button" class="btn ghost small" data-add="experiences">＋ Add another role</button>`;
  }

  function stepSkills() {
    return `
      ${chipField('skills', 'Your skills', 'Type a skill and press Enter', 'Hard skills, tools and soft skills all count. The more, the merrier.')}
      <div class="field"><label>Need inspiration? Tap to add</label><div class="chips" id="skillSuggest"></div></div>
      ${chipField('languages', 'Languages you speak', 'e.g. English, Spanish')}`;
  }

  function stepEducation() {
    return `
      <div data-repeater="education">
        ${state.draft.education.map((_, i) => `
          <div class="repeater-item">
            ${state.draft.education.length > 1 ? `<button type="button" class="remove" data-remove-item="${i}" aria-label="Remove education">✕</button>` : ''}
            <div class="row">
              ${field(`education.${i}.degree`, 'Degree / certificate', { placeholder: 'e.g. BSc, MBA, Bootcamp' })}
              ${field(`education.${i}.field`, 'Field', { placeholder: 'e.g. Computer Science' })}
            </div>
            ${field(`education.${i}.school`, 'School', { placeholder: 'e.g. University of Somewhere' })}
          </div>`).join('')}
      </div>
      <button type="button" class="btn ghost small" data-add="education">＋ Add another</button>
      <p class="hint">Self-taught? Totally valid. Skip this step 🙌</p>`;
  }

  function stepPreferences() {
    const pref = state.draft.remotePreference;
    const opt = (v, label) => `<label><input type="radio" name="remotePreference" value="${v}" ${pref === v ? 'checked' : ''} /><span>${label}</span></label>`;
    return `
      ${chipField('desiredRoles', 'Roles you\'re crushing on', 'e.g. Product Manager', 'These drive the job search. Add 1–3 titles.')}
      <div class="field"><label>Where do you want to work?</label>
        <div class="segmented">${opt('remote', '🏝️ Remote')}${opt('hybrid', '🔀 Hybrid')}${opt('onsite', '🏢 On-site')}${opt('any', '🤷 Anything')}</div>
      </div>
      <label class="check field"><input type="checkbox" name="openToRelocation" ${state.draft.openToRelocation ? 'checked' : ''} /> ✈️ I'm open to relocating</label>
      <div class="row">
        ${field('yearsExperience', 'Years of experience', { type: 'number', placeholder: 'Auto from your roles', hint: 'Leave blank and we\'ll calculate it.' })}
        ${field('salaryMin', 'Minimum salary (optional)', { type: 'number', placeholder: 'e.g. 80000' })}
      </div>
      ${chipField('industries', 'Industries you love', 'e.g. Fintech, Healthcare')}`;
  }

  function wireRepeaters(form) {
    $$('[data-add]', form).forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.add;
      state.draft[key].push(structuredClone(EMPTY_DRAFT[key][0]));
      if (key === 'experiences') state.draft[key].at(-1).current = false;
      save(); renderWizard();
    }));
    $$('[data-remove-item]', form).forEach((b) => b.addEventListener('click', () => {
      const key = b.closest('[data-repeater]').dataset.repeater;
      state.draft[key].splice(Number(b.dataset.removeItem), 1);
      save(); renderWizard();
    }));
  }

  function addChip(list, value) {
    const v = value.trim();
    if (!v) return false;
    const arr = state.draft[list];
    if (arr.some((x) => x.toLowerCase() === v.toLowerCase())) return false;
    arr.push(v);
    save();
    return true;
  }

  function wireChipInputs(form) {
    $$('.chip-input', form).forEach((box) => {
      const list = box.dataset.list;
      const input = $('input', box);
      box.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-remove]');
        if (rm) { state.draft[list].splice(Number(rm.dataset.remove), 1); save(); renderWizard(); focusChip(list); return; }
        input.focus();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          if (addChip(list, input.value)) { renderWizard(); focusChip(list); } else input.value = '';
        } else if (e.key === 'Backspace' && !input.value && state.draft[list].length) {
          state.draft[list].pop(); save(); renderWizard(); focusChip(list);
        }
      });
    });
  }
  const focusChip = (list) => $(`#chip-${list}`)?.focus();
  function flushChipInputs(form) {
    $$('.chip-input', form).forEach((box) => { const i = $('input', box); if (i.value.trim()) addChip(box.dataset.list, i.value); i.value = ''; });
  }

  async function suggestSkills() {
    const el = $('#skillSuggest');
    const have = new Set(state.draft.skills.map((s) => s.toLowerCase()));
    let spotted = [];
    try {
      const { profile } = await api('/api/persona', state.draft);
      spotted = profile.skills.filter((s) => !have.has(s.toLowerCase())).map(cap);
    } catch { /* offline: just show popular */ }
    const pool = [...new Set([...spotted, ...POPULAR_SKILLS])].filter((s) => !have.has(s.toLowerCase())).slice(0, 18);
    if (!el) return;
    el.innerHTML = pool.map((s, i) => `<button type="button" class="chip suggest" data-s="${esc(s)}">${i < spotted.length ? '🔎 ' : '＋ '}${esc(s)}</button>`).join('')
      + (spotted.length ? '' : '');
    if (spotted.length) el.insertAdjacentHTML('beforebegin', '<p class="hint">🔎 = we spotted it in your experience</p>');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (b && addChip('skills', b.dataset.s)) renderWizard();
    });
  }

  // ======================================================================
  // Persona
  // ======================================================================
  function renderPersona() {
    const p = state.persona;
    if (!p) { renderNeedProfile(); return; }
    app.innerHTML = `
      <section class="persona">
        <div class="big-emoji" aria-hidden="true">${p.emoji}</div>
        <div><span class="level">${esc(p.levelLabel)}</span></div>
        <h1>${esc(p.archetype)}</h1>
        <p class="tagline">${esc(p.tagline)}</p>
      </section>
      <section class="persona-body">
        <div class="card"><h3>📖 Your story in one breath</h3><p>${esc(p.bio)}</p></div>
        ${p.superpowers.length ? `<div class="card"><h3>⚡ Superpowers</h3><div class="chips">${p.superpowers.map((s) => `<span class="chip match">${esc(cap(s))}</span>`).join('')}</div></div>` : ''}
        ${p.vibes.length ? `<div class="card"><h3>🌈 Your vibe</h3><div class="chips">${p.vibes.map((v) => `<span class="chip vibe">${esc(v)}</span>`).join('')}</div></div>` : ''}
        ${p.achievements.length ? `<div class="card"><h3>🏆 Brag-worthy wins we'll use in your tips</h3><ul class="achievements">${p.achievements.slice(0, 4).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`
          : `<div class="card"><h3>🏆 Pro tip</h3><p>We didn't find any numbers in your experience. Add things like "cut costs 20%" in your profile and your tips get much better.</p></div>`}
        <div class="card"><h3>🔍 We'll search for</h3><div class="chips">${p.searchQueries.map((q) => `<span class="chip">${esc(q)}</span>`).join('')}</div></div>
        <button class="btn" id="findBtn" style="width:100%;padding:18px">${state.feed ? '🔄 Refresh my matches' : '💘 Show me my matches'}</button>
        ${state.feed ? '<a class="btn ghost" href="#/swipe">🔥 Back to swiping</a>' : ''}
      </section>`;
    $('#findBtn').addEventListener('click', findJobs);
  }

  function renderNeedProfile() {
    app.innerHTML = `<div class="empty"><div class="big">🫣</div><h2>We haven't met yet!</h2><p>Build your profile so we can find your perfect match.</p><a class="btn" href="#/profile">💘 Let's go</a></div>`;
  }

  // ======================================================================
  // Loading + search
  // ======================================================================
  const LOADING_LINES = ['Looking through the job boards… 🕵️', 'Checking Remotive, The Muse, RemoteOK & friends… 📡',
    'Comparing your skills with every posting… 🧪', 'Working out the chemistry… 💞', 'Writing your tips… ✍️', 'Almost there… 🧴'];

  function renderLoading() {
    app.innerHTML = `<div class="loading"><div class="spinner">💘</div><h2>Finding your matches</h2><p id="loadLine">${LOADING_LINES[0]}</p></div>`;
    let i = 0;
    clearInterval(renderLoading.timer);
    renderLoading.timer = setInterval(() => {
      const el = $('#loadLine');
      if (!el) { clearInterval(renderLoading.timer); return; }
      el.textContent = LOADING_LINES[++i % LOADING_LINES.length];
    }, 1400);
  }

  async function findJobs() {
    go('loading');
    try {
      const demo = new URLSearchParams(location.search).get('demo') === '1';
      const data = await api(`/api/jobs${demo ? '?demo=1' : ''}`, state.draft);
      state.persona = data.persona;
      state.feed = { jobs: data.jobs, usedDemo: data.usedDemo, sources: data.sources };
      state.index = 0; state.history = [];
      save();
      clearInterval(renderLoading.timer);
      go('swipe');
      toast(`Found ${data.jobs.length} potential matches 🔥`);
    } catch (err) {
      clearInterval(renderLoading.timer);
      toast(`Search hiccup: ${err.message}`);
      go('persona');
    }
  }

  // ======================================================================
  // Swipe deck
  // ======================================================================
  const coverClass = (score) => (score >= 70 ? '' : score >= 55 ? 'warm' : score >= 40 ? 'cool' : 'calm');
  const initials = (c) => esc(String(c || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase());

  function cardHTML(job, depth) {
    const m = job.match;
    const meta = [job.remote ? '🏝️ Remote' : null, job.location && !/^remote$/i.test(job.location) ? `📍 ${job.location.replace(/^remote\s*/i, '').replace(/^\((.*)\)$/, '$1') || job.location}` : null, job.salary ? `💰 ${job.salary}` : null, `🔗 ${job.source}`].filter(Boolean);
    return `
      <article class="job-card ${depth === 0 ? 'top' : ''}" data-depth="${depth}" data-id="${esc(job.id)}" aria-hidden="${depth !== 0}">
        <div class="stamp like">LIKE 💘</div><div class="stamp nope">NOPE</div><div class="stamp super">SUPER ⭐</div>
        <div class="cover ${coverClass(m.score)}">
          <div class="cover-top">
            <div class="avatar">${job.logo ? `<img src="${esc(job.logo)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${initials(job.company)}'))" />` : initials(job.company)}</div>
            <div class="company">${esc(job.company)}</div>
            <div class="ring" style="--p:${m.score}" aria-label="${m.score}% match"><b>${m.score}%</b></div>
          </div>
          <h2>${esc(job.title)}</h2>
          <div class="meta">${meta.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
        </div>
        <div class="body">
          <p class="label-line">${m.label.emoji} ${esc(m.label.text)}</p>
          ${m.matchedSkills.length ? `<div class="chips">${m.matchedSkills.slice(0, 6).map((s) => `<span class="chip match">${esc(cap(s))}</span>`).join('')}${m.missingSkills.slice(0, 3).map((s) => `<span class="chip miss">${esc(cap(s))}</span>`).join('')}</div>` : ''}
          <div class="bars">
            ${[['🧠 Skills', m.breakdown.skills], ['🏷️ Role fit', m.breakdown.title], ['📶 Level', m.breakdown.seniority], ['📍 Location', m.breakdown.location]]
              .map(([l, v]) => `<span>${l}</span><div class="track"><div class="fill" style="width:${v}%"></div></div><span>${v}%</span>`).join('')}
          </div>
          <p class="desc">${esc(job.description)}</p>
          <button class="btn ghost small tips-toggle" data-tips>💡 How to win them over</button>
          <div class="tips-wrap" hidden>
            <p class="tips-headline">${esc(job.advice.headline)}</p>
            <ul class="tips">${job.advice.tips.map((t) => `<li><span>${t.icon}</span><div>${esc(t.text)}</div></li>`).join('')}</ul>
          </div>
        </div>
      </article>`;
  }

  function renderSwipe() {
    if (!state.persona) { renderNeedProfile(); return; }
    if (!state.feed) {
      app.innerHTML = `<div class="empty"><div class="big">🔍</div><h2>Ready when you are</h2><p>Your persona is ready. Let's find you some matches!</p><button class="btn" id="go">💘 Find my matches</button></div>`;
      $('#go').addEventListener('click', findJobs);
      return;
    }
    const jobs = state.feed.jobs;
    const remaining = jobs.length - state.index;
    if (remaining <= 0) {
      const n = Object.keys(state.liked).length;
      app.innerHTML = `<div class="empty"><div class="big">🎉</div><h2>You've seen every match!</h2>
        <p>You liked <b>${n}</b> ${n === 1 ? 'job' : 'jobs'}. Time to slide into their inboxes.</p>
        <div class="cta" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn" href="#/matches">💌 See my matches</a><button class="btn ghost" id="again">🔄 Search again</button>
        </div></div>`;
      $('#again').addEventListener('click', findJobs);
      return;
    }

    const failed = Object.entries(state.feed.sources || {}).filter(([, s]) => !s.ok && s.error !== 'not configured').map(([k]) => k);
    app.innerHTML = `
      <div class="deck-head"><h2>Today's crushes</h2><p>${remaining} left</p></div>
      ${state.feed.usedDemo ? `<details class="source-note"><summary>🧪 <b>Demo listings</b>: live job boards unreachable</summary>We couldn't reach the live job boards${failed.length ? ` (${esc(failed.join(', '))})` : ''}, so these are sample listings from made-up companies. The matching and tips are real.</details>` : ''}
      <div class="deck" id="deck">${jobs.slice(state.index, state.index + 3).map((j, d) => cardHTML(j, d)).reverse().join('')}</div>
      <div class="actions">
        <button class="action undo" id="undo" title="Undo (Z)" aria-label="Undo" ${state.history.length ? '' : 'disabled style="opacity:.4"'}>↩️</button>
        <button class="action nope" data-act="nope" title="Pass (←)" aria-label="Pass">✕</button>
        <button class="action super" data-act="super" title="Super-like (↑)" aria-label="Super-like">⭐</button>
        <button class="action like" data-act="like" title="Like (→)" aria-label="Like">♥</button>
      </div>
      <p class="kbd-hint">← nope · → like · ↑ super-like · Z undo · T tips</p>`;

    $$('[data-act]').forEach((b) => b.addEventListener('click', () => decide(b.dataset.act)));
    $('#undo').addEventListener('click', undo);
    wireTopCard();
  }

  function topCard() { return $('.job-card.top'); }

  function wireTopCard() {
    const card = topCard();
    if (!card) return;
    $('[data-tips]', card).addEventListener('click', () => toggleTips(card));

    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, pid = null;
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a') || e.button > 0) return;
      dragging = true; pid = e.pointerId; startX = e.clientX; startY = e.clientY; dx = dy = 0;
      card.setPointerCapture(pid);
      card.classList.add('dragging');
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      dx = e.clientX - startX; dy = e.clientY - startY;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      $('.stamp.like', card).style.opacity = Math.max(0, Math.min(1, dx / 110));
      $('.stamp.nope', card).style.opacity = Math.max(0, Math.min(1, -dx / 110));
      $('.stamp.super', card).style.opacity = Math.max(0, Math.min(1, -dy / 130)) * (Math.abs(dx) < 80 ? 1 : 0);
    });
    const end = (e) => {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      card.classList.remove('dragging');
      if (dx > 110) decide('like');
      else if (dx < -110) decide('nope');
      else if (dy < -130 && Math.abs(dx) < 80) decide('super');
      else { card.style.transform = ''; $$('.stamp', card).forEach((s) => { s.style.opacity = 0; }); }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function toggleTips(card) {
    const wrap = $('.tips-wrap', card);
    const btn = $('[data-tips]', card);
    wrap.hidden = !wrap.hidden;
    btn.textContent = wrap.hidden ? '💡 How to win them over' : '🙈 Hide tips';
    if (!wrap.hidden) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  let deciding = false;
  function decide(action) {
    const card = topCard();
    if (!card || deciding) return;
    deciding = true;
    const job = state.feed.jobs[state.index];
    const fly = { like: 'translate(140%, 40px) rotate(28deg)', nope: 'translate(-140%, 40px) rotate(-28deg)', super: 'translate(0, -140%) rotate(-4deg)' }[action];
    $(`.stamp.${action}`, card).style.opacity = 1;
    card.style.transform = fly;
    card.style.opacity = 0;

    if (action !== 'nope') state.liked[job.id] = { job, super: action === 'super', at: Date.now() };
    state.history.push({ id: job.id, action });
    if (state.history.length > 50) state.history.shift();
    state.index += 1;
    save();

    setTimeout(() => {
      deciding = false;
      renderSwipe();
      if (action === 'super') showMatch(job, true);
      else if (action === 'like' && job.match.score >= 70) showMatch(job, false);
      else if (action === 'like') toast(`Saved ${job.company} to your matches 💌`);
    }, 280);
  }

  function undo() {
    const last = state.history.pop();
    if (!last) return;
    delete state.liked[last.id];
    state.index = Math.max(0, state.index - 1);
    save();
    renderSwipe();
    toast('Second chances are romantic ↩️');
  }

  function showMatch(job, isSuper) {
    confetti();
    const el = document.createElement('div');
    el.className = 'overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="box">
        <h1>${isSuper ? 'Super Crush! ⭐' : "It's a Match! 💘"}</h1>
        <p>You and <b>${esc(job.company)}</b> are <b>${job.match.score}%</b> compatible for <b>${esc(job.title)}</b>.</p>
        <div class="btns">
          ${job.url ? `<a class="btn warm" href="${esc(job.url)}" target="_blank" rel="noopener">🚀 Apply now</a>` : ''}
          <a class="btn" href="#/matches?open=${encodeURIComponent(job.id)}" data-close>💡 See how to win them</a>
          <button class="btn ghost" data-close>Keep swiping 🔥</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const close = () => el.remove();
    $$('[data-close]', el).forEach((b) => b.addEventListener('click', close));
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    $('[data-close]', el).focus();
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['--brand-terracotta', '--brand-rose', '--brand-berry', '--brand-dusk', '--brand-steel', '--brand-cream'].map((v) => getComputedStyle(document.documentElement).getPropertyValue(v));
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = `${Math.random() * 100}vw`;
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
      c.style.animationDelay = `${Math.random() * 0.3}s`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3600);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!location.hash.startsWith('#/swipe') || $('.overlay')) {
      if (e.key === 'Escape') $('.overlay')?.remove();
      return;
    }
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const map = { ArrowRight: 'like', ArrowLeft: 'nope', ArrowUp: 'super' };
    if (map[e.key]) { e.preventDefault(); decide(map[e.key]); }
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if ((e.key === 't' || e.key === 'T') && topCard()) toggleTips(topCard());
  });

  // ======================================================================
  // Matches
  // ======================================================================
  function renderMatches() {
    const filter = store.get('matchFilter', 'all');
    const openId = new URLSearchParams(location.hash.split('?')[1] || '').get('open');
    let items = Object.values(state.liked).sort((a, b) => (b.super - a.super) || (b.job.match.score - a.job.match.score));
    const total = items.length;
    if (filter === 'super') items = items.filter((i) => i.super);
    if (filter === 'hot') items = items.filter((i) => i.job.match.score >= 70);

    if (!total) {
      app.innerHTML = `<div class="empty"><div class="big">💌</div><h2>No matches yet</h2><p>Swipe right on jobs you like and they'll wait for you here, with tips to stand out.</p><a class="btn" href="#/swipe">🔥 Start swiping</a></div>`;
      return;
    }
    const fbtn = (k, label) => `<button class="btn small ${filter === k ? '' : 'ghost'}" data-filter="${k}">${label}</button>`;
    app.innerHTML = `
      <h2>Your matches 💌</h2>
      <div class="filters">${fbtn('all', `All (${total})`)}${fbtn('super', '⭐ Super crushes')}${fbtn('hot', '🔥 70%+')}</div>
      ${items.length ? '' : '<p class="hint">Nothing here with this filter.</p>'}
      ${items.map(({ job, super: sup }) => {
        const m = job.match;
        return `
        <details class="match-item" data-id="${esc(job.id)}" ${openId === job.id ? 'open' : ''}>
          <summary>
            <div class="avatar">${initials(job.company)}</div>
            <div class="info"><b>${esc(job.title)}${sup ? '<span class="super-tag">⭐ SUPER</span>' : ''}</b><small>${esc(job.company)} · ${job.remote ? 'Remote' : esc(job.location)} · ${esc(job.source)}</small></div>
            <div class="ring" style="--p:${m.score}"><b>${m.score}%</b></div>
          </summary>
          <div class="detail">
            <p class="label-line">${m.label.emoji} ${esc(m.label.text)}</p>
            <div class="chips">${m.matchedSkills.map((s) => `<span class="chip match">${esc(cap(s))}</span>`).join('')}${m.missingSkills.map((s) => `<span class="chip miss">${esc(cap(s))}</span>`).join('')}</div>
            <p class="tips-headline">${esc(job.advice.headline)}</p>
            <ul class="tips">${job.advice.tips.map((t) => `<li><span>${t.icon}</span><div>${esc(t.text)}</div></li>`).join('')}</ul>
            <div class="links">
              ${job.url ? `<a class="btn small warm" href="${esc(job.url)}" target="_blank" rel="noopener">🚀 Apply</a>` : '<span class="chip">🧪 Demo listing, no apply link</span>'}
              <a class="btn small ghost" href="${esc(job.linkedin.similarJobs)}" target="_blank" rel="noopener">🔎 Similar on LinkedIn</a>
              <a class="btn small ghost" href="${esc(job.linkedin.people)}" target="_blank" rel="noopener">🤝 Find a recruiter</a>
              <a class="btn small ghost" href="${esc(job.linkedin.company)}" target="_blank" rel="noopener">🏢 Company page</a>
              <button class="btn small ghost" data-unmatch="${esc(job.id)}">💔 Unmatch</button>
            </div>
          </div>
        </details>`;
      }).join('')}`;

    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => { store.set('matchFilter', b.dataset.filter); renderMatches(); }));
    $$('[data-unmatch]').forEach((b) => b.addEventListener('click', () => {
      delete state.liked[b.dataset.unmatch];
      save(); renderMatches(); toast("It's not you, it's them 💔");
    }));
    if (openId) $(`[data-id="${CSS.escape(openId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- boot ----------
  updateBadge();
  route();
})();
