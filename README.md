# 💘 JobCrush: swipe right on your future

JobCrush is a job-matching app with a dating-app feel:

1. **You fill in your resume** (name, headline, roles, achievements, skills, education, preferences), or paste the whole resume in *lazy mode*.
2. **It builds your career persona**: an archetype (e.g. *The Code Wizard*, *The Data Whisperer*), your level, superpowers, vibe, and the quantified wins pulled from your experience.
3. **It searches the job boards**, scores every posting with a **match %** (skills, role fit, seniority, location), and deals the results as **swipeable cards**.
4. **Every card has tips for that company**: which of your skills to lead with, which achievement to put first, how to handle gaps, how to answer the culture cues in the posting, plus LinkedIn shortcuts to find similar roles and a recruiter.

| Gesture / key | Action |
|---|---|
| Swipe right / → / ♥ | Like (saved to *Matches*; 70%+ shows "It's a Match!") |
| Swipe left / ← / ✕ | Pass |
| Swipe up / ↑ / ⭐ | Super-like |
| Z / ↩️ | Undo |
| T | Show the tips on the current card |

## Run it

Needs Node 18+. There are no dependencies to install.

```bash
npm start          # http://localhost:3000
npm run demo       # force the built-in demo listings
npm test           # engine tests
```

## Where the jobs come from

| Source | Key needed | Notes |
|---|---|---|
| [Remotive](https://remotive.com/api/remote-jobs) | none | remote jobs, server-side search |
| [Arbeitnow](https://www.arbeitnow.com/api/job-board-api) | none | EU-heavy, filtered by your roles |
| [The Muse](https://www.themuse.com/developers/api/v2) | none | filtered by your level |
| [RemoteOK](https://remoteok.com/api) | none | remote jobs |
| [JSearch (RapidAPI)](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) | `RAPIDAPI_KEY` | **includes LinkedIn**, Indeed and Glassdoor listings |
| [Adzuna](https://developer.adzuna.com/) | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | many countries (`ADZUNA_COUNTRY`) |

**About LinkedIn:** LinkedIn has no public jobs API, and scraping it breaks their terms. JobCrush gets LinkedIn listings legitimately through JSearch. Every match also gets deep links to LinkedIn job search, the company page and a recruiter search.

If no source returns results (offline, blocked network), the app falls back to `data/sample-jobs.json`: listings from **made-up companies**, clearly labelled *Demo*.

Copy `.env.example` and export the variables to enable the keyed sources.

## 🎨 Palette

The palette comes from the brand banner: one gradient running **terracotta `#C67967` → rose `#A55463` → berry `#863E63` → dusk violet `#5D567F` → steel blue `#456C95`**, with cream (`#FFF4EA`) line art. The type follows the banner too: italic serif headlines (Fraunces) with a bold geometric sans (Plus Jakarta Sans).

All colors are tokens at the top of `public/styles.css`, along with their dark-mode versions. Change them there and the whole UI follows.

## How the match % works

`lib/matcher.js`, weighted:

- **45% skills**: the skills in the posting that you have (the denominator is capped so long "nice-to-have" lists don't punish you)
- **25% role fit**: overlap between the job title and your desired or past titles
- **15% seniority**: your level (from years of experience) vs. the level in the title
- **15% location**: your remote, hybrid or on-site preference, your city and whether you'd relocate

## Project layout

```
server.js              zero-dependency HTTP server + API
lib/skills.js          skill dictionary, extraction, archetypes
lib/persona.js         profile normalisation + persona builder
lib/matcher.js         match scoring
lib/tips.js            company-specific tips + LinkedIn links
lib/search.js          source orchestration, dedupe, ranking, demo fallback
lib/sources/           job-board adapters
public/                swipe UI (vanilla JS, no build step)
test/                  node:test suite
```

API: `POST /api/persona` and `POST /api/jobs` (`?demo=1` to force demo data). Both take the profile JSON.
