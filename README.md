# Agent Penguin

Agent Penguin applies to jobs for you on **LinkedIn, Naukri and Indeed**, inside your own Chrome and with your own accounts. It searches for your roles in your cities, scores how well each job fits you, fills in every application form (contact details, resume, and every screening question) and submits it. Anything it can't finish safely, such as a security check, a redirect to a company website or a question it can't answer honestly, goes to **Needs review** with the reason, so you can finish it in one form.

Around the agent there is everything a job seeker needs in one place:
- **Job market:** news, walk-in drives and government exam updates.
- **Inbox tracker:** reads your job emails and writes follow-ups.
- **Automation:** scheduled runs and alerts on Telegram, WhatsApp or email.
- **Mocks:** AI mock interviews and timed mock tests.
- **Penguin Profile:** tests your skills, analyses your LeetCode, Codeforces, CodeChef and GitHub profiles, and suggests roles that fit you.

> **Penguin AI** (the chat assistant on the home screen) is a separate product that lives in the same app. Everything else in this README is **Agent Penguin**.

---

## Contents

1. [How it works](#how-it-works)
2. [Quick start](#quick-start)
3. [Features](#features)
   - [Accounts and sign-in](#1-accounts-and-sign-in)
   - [Profile](#2-profile)
   - [Connecting Chrome](#3-connecting-chrome)
   - [Run settings](#4-run-settings)
   - [Running Penguin](#5-running-penguin)
   - [Job sites](#6-job-sites)
   - [How questions are answered](#7-how-questions-are-answered)
   - [Needs review and Finish](#8-needs-review-and-finish)
   - [Applications tab](#9-applications-tab)
   - [Job market](#10-job-market)
   - [Live Agent, Activity Log and Overview](#11-live-agent-activity-log-and-overview)
   - [Inbox tracker and follow-ups](#12-inbox-tracker-and-follow-ups)
   - [Automation: scheduled runs and alerts](#13-automation-scheduled-runs-and-alerts)
   - [Mocks](#14-mocks)
   - [Penguin Profile](#15-penguin-profile)
   - [Penguin AI and other tools](#16-penguin-ai-and-other-tools)
   - [Admin console](#17-admin-console)
   - [Look and feel](#18-look-and-feel)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [API reference](#api-reference)
7. [Where data is stored](#where-data-is-stored)
8. [Environment variables](#environment-variables)
9. [Safety and privacy](#safety-and-privacy)
10. [Troubleshooting](#troubleshooting)

---

## How it works

```
 Dashboard (React, :5173)  ──HTTP + live events (SSE)──►  Backend (Express, :3001)
        │                                                       │
        │  sign-in, applications (Supabase)                     │  Playwright over CDP
        ▼                                                       ▼
   Supabase (Auth + Postgres)  ◄── saves every result ──  Your Chrome (LinkedIn / Naukri / Indeed tabs)
                                                                │
                                              AI: Groq → OpenAI → Gemini (and Claude for job scoring)
```

1. You sign in, upload your resume and answer the common application questions once.
2. You open LinkedIn, Naukri and/or Indeed in your normal Chrome and turn on remote debugging once.
3. You choose your roles, cities, number of applications and sites, then press **Run Penguin**.
4. For every site × role × city, Penguin searches, scores each job against your profile, and applies to the best matches in several tabs at once. All chosen sites run at the same time.
5. Each result (Applied, Needs review or Filtered out) is saved to Supabase and appears on the dashboard instantly.
6. The run stops when the target is reached or when you press Stop, and an alert sums it up.

---

## Quick start

### Requirements

| What | Why |
|---|---|
| **Node.js 20.19+** (or 22.12+) | Runs the backend and Vite 8 |
| **Google Chrome** | Penguin works inside your everyday Chrome, with your sign-ins |
| **A Supabase project** (free tier is fine) | Sign-in and storage of your applications |
| **At least one AI key**: Groq (free), OpenAI or Gemini | Answers questions, scores jobs, writes follow-ups, runs mocks. Without a key, Penguin falls back to rules and keyword scoring, and AI-only features are off. |

### Setup

```bash
git clone https://github.com/subhashkalakota-wq/AgentPenguin.git
cd AgentPenguin
npm install
cp .env.example .env        # fill in your keys (see "Environment variables")
```

1. **Supabase**
   - Run [supabase_schema.sql](supabase_schema.sql) in the Supabase SQL editor. It creates the `profiles` and `applied_jobs` tables with row-level security.
   - Turn on the **Email** and **Google** sign-in providers.
   - Put your project URL and **anon (public) key** in [src/lib/supabaseConfig.js](src/lib/supabaseConfig.js).
   - Put the project URL and **service role key** in `.env`. The service role key is for the server only and must never go in frontend code.
2. **Start the backend:** `npm run server` (http://localhost:3001).
3. **Start the dashboard:** `npm run dev` (http://localhost:5173).
4. **Connect Chrome:**
   - In Chrome, open `chrome://inspect/#remote-debugging` and turn remote debugging on.
   - In the dashboard, open **CDP Connection** and click **Connect Chrome**.
   - Click **Allow** in Chrome once.
5. Sign in, complete your **Profile** (resume plus application questions), open the job sites you want in Chrome, and press **Run Penguin**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dashboard with hot reload (Vite) |
| `npm run server` | Backend API, the agent and the scheduler |
| `npm run build` | Production build of the dashboard into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Lints the code with oxlint |

---

## Features

Each feature lists **what it does**, **how it works** and the **tools** behind it.

### 1. Accounts and sign-in

- **Email and password sign-up and sign-in**, plus **Sign in with Google**.
- **Your data is yours only.** Every application row belongs to your user. Supabase row-level security stops anyone else from reading it.
- **Profile sync.** Your profile is saved in your Supabase account, so it follows you to any browser. It is also cached in the browser for speed.
- **Blocked users.** An admin can block an account. Blocked users can't sign in, and the backend refuses their runs.

**How it works:** the dashboard signs in with Supabase Auth. Every call to the backend carries the user's access token (`authFetch` in [src/lib/api.js](src/lib/api.js)), and the backend checks that token with Supabase before doing anything that needs to know who is calling.

**Tools:** Supabase Auth (email and Google), `@supabase/supabase-js`, Postgres row-level security.

### 2. Profile

The **Profile** tab holds everything Penguin needs to fill in forms:

| Section | What's in it |
|---|---|
| **Personal details** | Name, email, phone and country code, location |
| **Resume** | Upload a PDF or DOCX. Penguin attaches it to applications and analyses it. |
| **Work details** | Experience, current role, notice period, current and expected CTC, degree, relocation |
| **Links** | LinkedIn, GitHub, portfolio. Penguin only fills these into link fields. |
| **Skills** | Your skill list, which is also shown and managed in Penguin Profile |
| **Application questions** | Common questions answered once ("Why should we hire you?", "Tell us about yourself", CTC and more). Penguin reuses these answers. |
| **Answers Penguin learned** | Answers you gave while finishing Needs-review jobs, which you can edit or delete |
| **Job search preferences** | Roles, location, experience level and run limits |

- **Resume analysis.** After upload, the AI reads the resume and pulls out your total experience, years per skill, education and current role, using only what the resume says. A skill the resume doesn't mention counts as 0 years, so Penguin never claims experience you don't have.
- **"Finish your profile" reminder.** A banner across the dashboard says exactly what is missing (resume, application answers or contact details) until the profile is complete. A dot on the Profile icon shows the same.

**Tools:**
- `pdf-parse` (PDF text) and `mammoth` (DOCX text);
- the AI chain in [server/llm.js](server/llm.js);
- the shared question list in [shared/screeningQuestions.js](shared/screeningQuestions.js).

### 3. Connecting Chrome

Penguin uses **your real Chrome**, already signed in to LinkedIn, Naukri and Indeed. It never asks for your job-site passwords.

- **Click Allow once.** Chrome asks before any program can control it. Penguin keeps a single approved connection open, so you approve once and it works across every run and backend restart until you quit Chrome.
- **Sleeping tabs don't block it.** Tabs that Chrome's memory saver has put to sleep are skipped, so connecting never hangs.
- **It can't close your browser.** Commands that would close or crash Chrome are refused.
- **CDP Connection tab:** connection status, a **Test / Reconnect** button, step-by-step help for Mac and Windows, and the connection log.
- **Reminders.** A "Chrome isn't connected" reminder appears on dashboard pages until you connect. The sidebar shows a green or red dot for the connection.
- **Platform check.** Before a run, Penguin checks which job sites are open as tabs. You can open a missing site from the platform picker with one click.

**How it works:**
- [server/cdpClient.js](server/cdpClient.js) finds Chrome's debugging address. It reads `DevToolsActivePort` from your Chrome profile folder, which Chrome writes when remote debugging is on; otherwise it tries `localhost:9222`.
- [server/cdpBridge.js](server/cdpBridge.js) is a small background process that starts detached, so it survives backend restarts. It holds the approved connection.
- [server/cdpProxy.js](server/cdpProxy.js) relays Playwright through that connection. It hides unresponsive tabs and blocks `Browser.close`.
- The bridge only listens on `127.0.0.1` and needs a random token, stored in `server/data/cdp-bridge.json` and readable by your user only.

**Tools:** Chrome DevTools Protocol, Playwright `connectOverCDP`, `ws` (WebSocket relay).

### 4. Run settings

Open **Config**, or click **Edit** on the run summary in the header:

| Setting | What it does |
|---|---|
| **Roles** | One or more job titles. Chips with type-ahead suggestions; any title can be typed. |
| **Locations** | One or more cities or countries. Penguin applies in all of them, and the Job market follows them. |
| **Experience level** | Internship, Entry level, Associate, Mid-Senior level, Director. Used as LinkedIn's experience filter. |
| **Job sites** | LinkedIn, Naukri, Indeed (any combination) |
| **Applications** | Target for the run (1–200) |
| **Match & pace** | Minimum match score (default 70%) and the pause between applications |
| **Tabs at once** | How many applications run in parallel (1–15), shared across sites |

- **Run summary in the header:** target, cities and roles at a glance, with an **Edit** button that opens the settings.
- Settings are saved in the browser and on the backend (`server/data/state.json`), so scheduled runs use them even when the dashboard is closed.

### 5. Running Penguin

- **Run Penguin.** Pick the sites (only sites open in Chrome can be picked) and start.
- **All sites at once.** LinkedIn, Naukri and Indeed apply at the same time, each in its own tabs. They share the target fairly: 15 applications on 3 sites is 5 each. A site that runs out of matches, gets blocked or is closed hands its unused share to the others.
- **Tabs shared fairly.** "Tabs at once" is split between the sites still working: 5 tabs on 3 sites is 2 + 2 + 1. Each tab takes the next job from a shared queue, so the target is never exceeded.
- **Keeps going until the target.** Penguin searches deeper result pages for every site × role × city until it reaches the target, you press Stop, or no site has new listings.
- **Search → score → apply.**
  - **Search:** new listings are fetched for each role and city. Jobs you already applied to, or that are in Needs review, are skipped.
  - **Score:** the AI rates each job 0–100 against your profile and decides apply, skip or flag. Jobs below your minimum score are marked **Filtered out**. If no job clears the bar, Penguin tries the closest half instead of applying to nothing.
  - **Apply:** forms are filled and submitted (see [How questions are answered](#7-how-questions-are-answered)).
- **Time limit per job.** One application can't hold a tab for more than 4 minutes. A stuck form is discarded and its tab is reopened fresh.
- **Recovers from problems.**
  - If you close a tab, Penguin opens a new one and carries on.
  - Stopping mid-form discards the draft, so the job site doesn't keep a half-filled application.
  - Three security checks in a row mean the account is being checked. Penguin pauses the run and sends a "Penguin needs you" alert. Complete the check in Chrome, then click **Resume**.
- **Controls:**
  - **Pause / Resume** the run.
  - **Stop** ends it cleanly.
  - **Reset** clears the run state.
  - **Step Apply** applies to just the next shortlisted job, on its own site.
  - **Apply selected** applies to jobs you tick in the applications table.
- **Live progress.** The header shows "This run x / target". A floating running-penguin window shows the job being applied to now, and can be minimised to a small pill.

**Tools:**
- Playwright (browser automation);
- the AI chain for scoring ([server/llmFilter.js](server/llmFilter.js)): Claude when an Anthropic key is set, otherwise Groq → OpenAI → Gemini, otherwise keyword scoring;
- Server-Sent Events (`/api/stream`) for live updates.

### 6. Job sites

| Site | How Penguin searches | How Penguin applies |
|---|---|---|
| **LinkedIn** | LinkedIn's public job feed with the Easy Apply filter (`f_AL`) and experience filter (`f_E`), fetched from inside your LinkedIn tab. Ten jobs per page. | **Easy Apply** in the native dialog: contact details, resume, every question, then Next / Review / Submit. Everything is found by role, label and button text rather than class names, so LinkedIn redesigns rarely break it. |
| **Naukri** | Naukri search pages, paged with `pageNo` | Clicks Apply. Answers recruiter questions in Naukri's chat drawer one at a time. |
| **Indeed** | Indeed search results (titles from `.jobTitle`, with fallbacks) | Indeed's multi-step "Apply now" (smart apply) form, waiting for each step to load. "Apply on company site" jobs go to Needs review. |

- **Submission is confirmed.** A job counts as Applied only after the site confirms it was sent.
- **Real security checks only.** Penguin flags a job when there is an actual challenge on the page ("I'm not a robot", "verify you are human"). The small reCAPTCHA badge alone is ignored.

**Files:**
- [server/playwrightApplier.js](server/playwrightApplier.js): LinkedIn.
- [server/boardAppliers.js](server/boardAppliers.js): Naukri and Indeed.
- [server/platforms.js](server/platforms.js): search, platform detection, and blocked-page detection.
- [server/linkedinFeed.js](server/linkedinFeed.js): the LinkedIn feed.
- [server/scraper.js](server/scraper.js): older LinkedIn scraper.

### 7. How questions are answered

Penguin answers **every question type**:
- text and number boxes, and long text;
- dropdowns, radio buttons and checkboxes;
- select-all-that-apply;
- rating scales, Likert scales and sliders;
- yes/no and true/false.

For each question it tries these sources in order:

1. **An answer written for this job.** Open questions ("Why do you want to work here?") get an answer written from the job's description and your profile.
2. **Answers Penguin learned** from you when you finished Needs-review jobs.
3. **Your saved application answers** from Profile.
4. **Rules** for common questions:
   - experience and years per skill (from the resume analysis);
   - notice period, current and expected CTC (in lakhs when the form asks for LPA);
   - visa and work authorization, relocation, "available to start";
   - links: LinkedIn, GitHub and portfolio go only into URL fields;
   - production experience and similar yes/no questions.
5. **AI**, which must choose from the given options and may decline when your profile doesn't support an answer.
6. **A forced choice** for required fields. Only if nothing above works and the field must be filled, Penguin picks the most sensible option.

Rules that always apply:
- **Identity questions** (gender, race, disability, veteran status) are always answered with "decline to answer".
- **Field fit.** Prose is never typed into a URL, email or number box.
- **Skill levels** for scale questions come from your years of experience and skill-test scores.

**Files:** [server/questionAnswerer.js](server/questionAnswerer.js), [shared/screeningQuestions.js](shared/screeningQuestions.js).

### 8. Needs review and Finish

When Penguin can't finish a job safely, it saves it as **Needs review** with:
- **a reason**, e.g. "Security check", "Company website", "Questions Penguin couldn't answer", "Sign in needed", "Took too long";
- **a plain-English detail**, e.g. "couldn't get past step 3/5";
- **the questions** it couldn't answer, with its best guess.

- **Finish in one form.** Click **Finish** on the job. Penguin shows the open questions with the right input for each: options, multi-select or text.
- **Penguin learns.** Your answers are saved to "Answers Penguin learned" and reused on every future application.
- **Apply again.** Penguin re-applies to that job with your answers (`/api/review/retry`).
- **Mark as applied.** If you applied yourself, for example on the company website, you can mark the job as applied (`/api/review/mark-applied`).
- **Alerts.** You get a "Penguin needs you" alert when a sign-in or security check stops it.

**Files:** [src/components/ReviewFinishModal.jsx](src/components/ReviewFinishModal.jsx).

### 9. Applications tab

- **Platforms banner.** Shows which sites Penguin applies on, with a **Run** button.
- **Job market** section at the top (next section).
- **Applications table:**
  - **Status tabs** with counts: All, Applied, Shortlisted, Needs review, Filtered out.
  - **Search** across role, company and location.
  - **Platform filter** (LinkedIn, Naukri, Indeed).
  - **Date range filter** with a calendar.
  - **Match score** and **status badge** on every row.
  - A "From your email" badge when the inbox tracker updated the job.
  - **Pagination** (15 per page) and **select all on this page**.
  - Row actions: **View** (detail page), **Open on the site**, and **Finish** for Needs-review jobs.
  - **Refresh** from Supabase.
- **Export to PDF.** A report of the filtered applications. jsPDF is loaded only when you export, to keep the app fast.
- **Application detail page:**
  - the AI's match analysis (score, pros, cons, matched skills);
  - the steps Penguin took;
  - a job description snippet;
  - a link to the job.

**Tools:** `jspdf` + `jspdf-autotable` (PDF export), Supabase (`applied_jobs` table).

### 10. Job market

At the top of the Applications tab, for your roles and cities:

| Card | What it shows | Source |
|---|---|---|
| **Market pulse** | New openings for each of your roles in the last 24 hours and 7 days | LinkedIn's public job pages |
| **Who's hiring** | Companies with the most openings for your roles near you | LinkedIn's public job pages |
| **Walk-in drives** | Walk-in interviews in your cities, with date and venue, confirmed from the posting text | LinkedIn postings, details pulled out by AI (nothing invented) |
| **Government jobs** | Exam notifications, admit cards and results: UPSC, SSC, state PSC groups, police, banks, railways, defence, teaching. Your state's boards come first. | Google News RSS |
| **Trending jobs** | Roles with the most new openings this week | LinkedIn's public job pages |
| **News** | Tabs for job news, tech news and developer news | Google News RSS (India), Hacker News |

- **Several cities?** Pick which one the market shows. The choice is remembered.
- **Hide / Show** collapses the whole section; the choice is remembered. A **Refresh** button forces fresh data. Data is cached for 30 minutes.
- **Walk-in alerts.** New walk-ins are checked every 3 hours and can be sent to you as an alert.

**Files:** [server/marketInsights.js](server/marketInsights.js), [src/components/MarketInsights.jsx](src/components/MarketInsights.jsx).

### 11. Live Agent, Activity Log and Overview

- **Live Agent.** While a run is on: the job being applied to now, the current step, the pacing countdown, and progress against the target, with Pause, Resume and Stop. It also shows a preview of the application form and its steps.
- **Activity Log.** Every action Penguin takes, live, colour-coded by type (search, AI, apply, warnings). You can clear it. The backend also writes it to `server/data/agent.log`.
- **Overview.** Cards for applications submitted, listings scanned, shortlist rate, needs review and average pacing. Below them: recent applications, recent activity, and how Penguin keeps you safe.

**Tools:** Server-Sent Events for the live feed.

### 12. Inbox tracker and follow-ups

- **Reads your job emails.** It uses the same Gmail account and app password as email alerts, and finds:
  - application confirmations and "viewed" notices;
  - assessments, interviews and offers;
  - rejections.
- **Updates your applications.** The AI works out what each email means and which application it belongs to, then updates that application's stage. Interview and test details (date, deadline, what to do) appear in **Updates from your email**.
- **Practise for it.** Interview and assessment emails have a **Practise** button that opens Mocks pre-filled for that role and company.
- **Checks every 30 minutes** when turned on. A **Check now** button runs it immediately.
- **Follow-ups.** Applications with no reply after 5, 7, 10 or 14 days (you choose) are listed.
  - Penguin writes a short follow-up email for that job.
  - You edit it and press Send. Nothing is sent without your approval.
  - It goes from your own account, as a reply in the recruiter's thread when there is one.
  - You can **Skip** any follow-up.

**Tools:**
- `imapflow` (reading mail over IMAP) and `mailparser` (email parsing);
- `nodemailer` (sending);
- the AI chain.

**File:** [server/inbox.js](server/inbox.js).

### 13. Automation: scheduled runs and alerts

**Scheduled runs**
- Pick weekdays and a time (India time). The backend starts a run on its own, using your saved settings.
- It checks every 30 seconds. If the backend was off at that minute, the run still starts if it comes back within the next hour.
- The **next run** is shown, e.g. "Tue 9:00 AM".

**Alerts** on **Telegram**, **WhatsApp** and/or **email**, for the events you switch on:
- a run finishes (what was sent, what needs you);
- an interview, test or offer arrives in your email;
- Penguin needs you (sign-in, security check);
- a scheduled run couldn't start;
- new walk-in drives for your roles and cities.

Channel setup:

| Channel | Setup |
|---|---|
| **Telegram** | Your own bot token (from @BotFather) and chat ID. **Detect** finds the chat ID after you message the bot. |
| **WhatsApp** | Your number and a free CallMeBot API key |
| **Email** | Your Gmail and an app password (or any SMTP server and port), plus where to send alerts |

- **Send test** checks each channel.
- Credentials are stored only in `server/data/notify.json` (readable by your user only) and are **never sent back to the browser**. The dashboard only learns whether each one is set.

**Tools:** Telegram Bot API, CallMeBot, `nodemailer`.

**Files:** [server/scheduler.js](server/scheduler.js), [server/notifier.js](server/notifier.js).

### 14. Mocks

**Mock interview with Penguin**
- Choose a role (or a company), the type (**Technical, HR, Behavioural**), the difficulty (Easy, Medium, Hard) and the number of questions (3, 5 or 8).
- Penguin asks one question at a time and never repeats one.
- Answer by typing, or **speak your answer**. Speech-to-text works in Chrome and Edge, and questions can be read aloud.
- Each answer gets a score, what went well and what to improve. A final summary lists strengths and what to practise next.

**Mock test with Penguin**
- Timed multiple-choice tests, one minute per question, with 10, 15 or 20 questions:
  - placement tests: aptitude, reasoning, verbal ability, data interpretation;
  - programming: Java, Python, C/C++, JavaScript, React, Node.js, SQL;
  - CS fundamentals: data structures and algorithms, OOP, DBMS, operating systems, networks;
  - any custom topic.
- A question palette shows which questions are answered and lets you jump between them; **Mark for review**; a countdown timer.
- At the end: your score and a full review with explanations.

**Real mocks.** Links to live mock interview sites (Pramp, interviewing.io, Preplaced, Topmate, InterviewBit and more) and mock test and contest sites (PrepInsta TCS NQT, IndiaBIX, GeeksforGeeks, HackerRank, LeetCode, Codeforces, Unstop, HackerEarth).

**Tools:** the AI chain ([server/mocks.js](server/mocks.js)), the browser Web Speech API (`SpeechRecognition`, `speechSynthesis`).

### 15. Penguin Profile

For people who aren't sure which role to aim for.

- **Pick your skills** from a catalog of 12 groups:
  - Programming languages, Frontend, Backend, Mobile, Databases, Cloud & DevOps;
  - Data & AI, Testing, CS fundamentals, Security, Design & product, Business & non-tech.

  Search across all of them, or type any skill that's missing.
- **Suggested skills** have their own tab next to **Your skills**. Each suggestion comes from your resume or coding profiles, shows why it was suggested, and has **Add** (or **Add all**).
- **Test my skills.** One timed test on the skills you picked (up to 10 at a time):
  - choose the difficulty and 3, 5 or 8 questions per skill, at one minute per question;
  - Penguin writes each skill's questions separately and shows which skills are ready;
  - every question is labelled with its skill, and the review at the end has explanations.

  Each skill can also be tested on its own with **Test** / **Retest**.
- **Skill report.** Your score on each skill and overall, with a plain verdict:
  - **Excellent** (90%+), **Very good** (70%+), **Good** (55%+), **Average** (40%+), **Poor** (below 40%);
  - one line per skill, e.g. "You're excellent at React." or "You're poor at SQL right now. Start with the basics below, then retest.";
  - the score also sets the skill's level (90%+ Expert, 70%+ Advanced, 40%+ Intermediate, otherwise Beginner), which a guess from the resume or coding profiles never overwrites.
- **Learn what you missed.** Every skill under 70% gets learning links:
  - **DSA** skills (data structures, algorithms, competitive programming) open **Viso DSA**, Agent Penguin's own visual DSA platform;
  - other skills link to the best-known free resource (e.g. react.dev, SQLBolt, javascript.info, Kaggle Learn, AWS Skill Builder) plus video courses;
  - the links live in [src/data/learningResources.js](src/data/learningResources.js).
- **Coding profiles.** Paste LeetCode, Codeforces, CodeChef and GitHub links or usernames, then click **Analyse**:
  - **LeetCode:**
    - pie chart of Easy / Medium / Hard solved;
    - bar chart of problems solved by topic;
    - contest rating, contests and top %, global ranking;
    - languages used.
  - **Codeforces:**
    - rating, max rating, rank, problems solved, contests;
    - a rating-over-time line chart;
    - a bar chart of problems solved by difficulty;
    - top tags.
  - **CodeChef:** rating and stars, highest rating, problems solved, contests, global rank.
  - **GitHub:**
    - public repositories, stars and followers;
    - repos updated in the last 90 days;
    - a pie chart of code by language;
    - top repositories;
    - an AI summary of the profile with three ways to make it stronger.
- **Skill levels from coding.** Your DSA, competitive programming, language and Git levels are worked out from these numbers, with the evidence shown.
- **Roles that fit your skills, based on your test.** After the test, the AI suggests 7 roles from how you scored (plus your resume and coding profiles):
  - skills you scored 70%+ on count as strengths;
  - skills under 40% are never the basis for a role and show up as things to learn;
  - each role shows fit %, why it fits, the skills you have, up to 3 to learn, seniority, and live counts of new openings today and this week in your city.

  If your scores change, Penguin tells you to suggest again. Before any test, you can still suggest roles without one.
  **Add to my roles** puts a role into your search, and **Run Penguin** starts applying.
- **Hide / Show** on every box, remembered in the browser.

**How it works:**
- LeetCode's public GraphQL API, Codeforces' official API, CodeChef's public profile page, and the GitHub REST API. Public data only, no logins.
- Results are cached for 6 hours per username.
- Charts are small hand-made SVG components ([src/components/charts.jsx](src/components/charts.jsx)):
  - tooltips on hover and keyboard focus;
  - legends for every multi-colour chart;
  - a colour palette checked for colour blindness, with separate light and dark colours.

**Files:**
- [src/data/learningResources.js](src/data/learningResources.js)
- [server/codingProfiles.js](server/codingProfiles.js)
- [server/careerAdvisor.js](server/careerAdvisor.js)
- [shared/skillsCatalog.js](shared/skillsCatalog.js)
- [src/components/PenguinProfileTab.jsx](src/components/PenguinProfileTab.jsx)

### 16. Penguin AI and other tools

- **Penguin AI** (home screen):
  - a chat assistant for job-search questions;
  - "train" it with your skills, roles and a short bio;
  - type **"Run penguin"** in the chat to start applying.

  It uses OpenAI when a key is set, otherwise a built-in reply engine.
- **Resume Analyzer** (`/resume-analyzer`): ATS score, keyword audit and match against a job.
- **Viso DSA** (`/viso-dsa`): interactive visualisers for sorting, trees, graphs and other data structures.
- **How to Run** guide (Mac and Windows) and **System status** in the header menu.

### 17. Admin console

A separate console at **`/admin`** with its own sign-in (email or Google). Only admins get in; any other account is signed straight back out.

| Page | What an admin can do |
|---|---|
| **Overview** | Applications per day, applications by platform, most active users, latest applications |
| **Users** | See every user's details, profile and applications. Block or unblock, make admin or remove admin, delete. Each action needs a second click to confirm. |
| **Applications** | See and delete any application |
| **Agent & system** | Live agent status, the running user's settings, service health and the agent log (refreshes every 5 seconds). **Stop** a running agent. |

- **Owners** are the emails in `ADMIN_EMAILS` (in `.env`). Owners can make other users admins and can't be blocked, demoted or deleted from the console.
- Admin status is stored where users can't edit it themselves (Supabase `app_metadata`).
- Blocking uses Supabase's built-in ban, which stops sign-in and token refresh.

**Files:** [server/admin.js](server/admin.js), [src/admin/](src/admin/).

### 18. Look and feel

- **Palette:** `#212121` ink, `#6D9886` sage, `#D9CAB3` sand, `#F6F6F6` paper.
- **Fonts:** **Inter** for text and tables, **Manrope** for headings.
- **3px corners** on every box, button and input: crisp, not sharp.
- **Light and dark mode**, switched from the header.
- **Sidebar.** Opens on hover and shows status dots (live run, profile incomplete, Chrome connected) and the application count. On phones it becomes a slide-out menu.
- **Works on phones.** Every page fits a phone screen without sideways scrolling.
- **One broken tab can't blank the app.** A tab that hits an error shows the message and a **Reload** button, and the other tabs keep working.

---

## Tech stack

| Layer | Tools |
|---|---|
| Dashboard | React 19, Vite 8, `lucide-react` icons, plain CSS with design tokens, hand-made SVG charts |
| Backend | Node.js, Express 5, Server-Sent Events, `dotenv`, `cors` |
| Browser automation | Playwright over the Chrome DevTools Protocol, `ws` relay |
| Database and auth | Supabase (Postgres + Auth, row-level security), `@supabase/supabase-js`, `pg` |
| AI | Groq → OpenAI → Gemini chain ([server/llm.js](server/llm.js)); Claude (Anthropic) optional for job scoring |
| Documents | `pdf-parse`, `mammoth` (resume text), `jspdf` + `jspdf-autotable` (PDF export) |
| Email | `imapflow`, `mailparser` (reading), `nodemailer` (sending) |
| Alerts | Telegram Bot API, CallMeBot (WhatsApp), SMTP |
| Public data | LinkedIn public job pages, Google News RSS, Hacker News, LeetCode GraphQL, Codeforces API, CodeChef profile pages, GitHub REST API |
| Quality | oxlint |

---

## Project structure

```
server/
  index.js              API, run loop, live events, scheduler and inbox startup
  playwrightApplier.js  LinkedIn Easy Apply
  boardAppliers.js      Naukri and Indeed applying
  platforms.js          Site detection, Naukri/Indeed search, blocked-page checks
  linkedinFeed.js       LinkedIn job search (public feed)
  scraper.js            Older LinkedIn scraper
  questionAnswerer.js   Answers every screening question
  llm.js                AI chain: Groq → OpenAI → Gemini
  llmFilter.js          Job scoring (apply / skip / flag)
  resumeAnalyzer.js     Resume text + AI analysis
  marketInsights.js     Job market, walk-ins, news, government jobs, trending roles
  inbox.js              Inbox tracker and follow-ups
  notifier.js           Telegram / WhatsApp / email alerts
  scheduler.js          Scheduled runs
  mocks.js              AI mock interviews and tests
  codingProfiles.js     LeetCode / Codeforces / CodeChef / GitHub analysis
  careerAdvisor.js      Role suggestions from skills
  admin.js              Admin API
  cdpClient.js          Finds and connects to your Chrome
  cdpBridge.js          Background process that keeps Chrome's approval
  cdpProxy.js           CDP relay used by the bridge
  state.js              Saves settings and profile to server/data/state.json
  data/                 Local data (git-ignored): state, alerts, logs, resume analysis
shared/                 Code used by both server and dashboard
  screeningQuestions.js Common application questions
  skillsCatalog.js      Skills catalog and test-score levels
  locations.js          Location helpers
src/
  App.jsx               Routing, tabs, run controls, live events
  components/           Tabs and pages (Applications, Profile, Penguin Profile, Mocks, Inbox, ...)
  admin/                Admin console
  lib/                  Supabase client, authorised fetch, PDF export
  data/                 Sidebar tabs, mock-test topics and sites
public/
  viso-dsa/             Viso DSA app
  resume-analyzer/      Resume Analyzer app
supabase_schema.sql     Database tables and security policies
```

---

## API reference

All endpoints are on `http://localhost:3001`.

| Area | Endpoints |
|---|---|
| Status and live events | `GET /api/status`, `GET /api/stream` (SSE) |
| Chrome | `POST /api/cdp/test`, `POST /api/cdp/launch`, `GET /api/platforms/status`, `POST /api/platforms/open` |
| Runs | `POST /api/start`, `POST /api/pause`, `POST /api/resume`, `POST /api/stop`, `POST /api/step`, `POST /api/apply-batch` |
| Settings and profile | `POST /api/config`, `POST /api/upload-resume`, `POST /api/resume/analyze` |
| Needs review | `POST /api/review/retry`, `POST /api/review/mark-applied` |
| Job market | `GET /api/market` |
| Automation | `GET /api/automation`, `POST /api/automation/schedule`, `POST /api/alerts/settings`, `POST /api/alerts/test`, `POST /api/alerts/telegram/detect` |
| Inbox | `GET /api/inbox`, `POST /api/inbox/settings`, `POST /api/inbox/check`, `POST /api/followup/draft`, `POST /api/followup/send`, `POST /api/followup/skip` |
| Mocks | `POST /api/mock/interview/question`, `POST /api/mock/interview/evaluate`, `POST /api/mock/interview/summary`, `POST /api/mock/test` |
| Penguin Profile | `POST /api/coding/analyze`, `POST /api/career/suggest` |
| Penguin AI | `POST /api/chat` |
| Admin | `GET /api/me`, `GET /api/admin/overview`, `GET /api/admin/users`, `GET /api/admin/users/:id`, `POST /api/admin/users/:id/block`, `POST /api/admin/users/:id/role`, `DELETE /api/admin/users/:id`, `GET /api/admin/applications`, `DELETE /api/admin/applications/:id`, `GET /api/admin/system`, `POST /api/admin/agent/stop` |

---

## Where data is stored

| Data | Where |
|---|---|
| Accounts | Supabase Auth |
| Applications (status, score, reason, review questions, inbox stage, follow-ups) | Supabase `applied_jobs` table, readable only by its owner |
| Profile | Supabase (account metadata and `profiles` table), plus a browser cache |
| Run settings, profile copy and schedule (for scheduled runs) | `server/data/state.json` |
| Alert credentials | `server/data/notify.json` (readable by your user only, never sent to the browser) |
| Chrome bridge token | `server/data/cdp-bridge.json` (readable by your user only) |
| Agent log | `server/data/agent.log` |
| Uploaded resumes | `public/uploads/` |
| Coding-profile charts, role suggestions, hidden boxes, market city | Your browser (`localStorage`) |

`server/data/`, `public/uploads/`, `public/*.pdf` and `.env` are git-ignored, so personal data stays out of the repository.

---

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Needed? | What it's for |
|---|---|---|
| `PORT` | Optional | Backend port (default `3001`) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for saving applications and the admin console. Never put it in frontend code. |
| `ADMIN_EMAILS` | For admin | Comma-separated owner emails for `/admin` |
| `GROQ_API_KEY` | One AI key needed | Groq (first in the AI chain) |
| `GROQ_MODEL` | Optional | Preferred Groq model |
| `OPENAI_API_KEY` | One AI key needed | OpenAI (second in the chain; also used by Penguin AI chat) |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini` |
| `GEMINI_API_KEY` | One AI key needed | Gemini (third in the chain) |
| `GEMINI_MODEL` | Optional | Preferred Gemini model |
| `ANTHROPIC_API_KEY` | Optional | Claude for job scoring |
| `ANTHROPIC_MODEL` | Optional | Claude model for job scoring |
| `GITHUB_TOKEN` | Optional | Raises GitHub's limit (60 requests an hour without it) for coding-profile analysis |

The frontend's public settings (Supabase URL, **anon** key, backend address) live in [src/lib/supabaseConfig.js](src/lib/supabaseConfig.js).

---

## Safety and privacy

- **Your browser, your accounts.** Penguin works in your own signed-in Chrome and never asks for job-site passwords.
- **Skip, don't guess.** If Penguin can't answer a question honestly, the job goes to Needs review instead of being submitted with a made-up answer. Skills your resume doesn't mention count as zero.
- **Identity questions are always declined.**
- **Nothing is sent in your name without you:**
  - follow-up emails need your approval, one by one;
  - alerts go only to channels you set up.
- **Paced and capped.** There's a pause between applications, a run target, a per-job time limit, and the run pauses when a site keeps showing security checks.
- **Secrets stay on the server.** API keys are in `.env`, and alert credentials in `server/data/notify.json`. Neither is sent to the browser.
- **Row-level security.** Each user can only read and change their own applications.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Chrome not connected" | Turn on remote debugging at `chrome://inspect/#remote-debugging`, then click **Connect Chrome** and **Allow** in Chrome. Quitting Chrome ends the connection; connect again after reopening. |
| A site isn't offered when starting a run | Open that site in a Chrome tab and sign in. Only open sites can be picked. |
| "Backend is not running" | Start it with `npm run server`. |
| Many jobs in Needs review with "Questions Penguin couldn't answer" | Finish them once. Penguin learns the answers and reuses them. Fill in Profile → Application questions too. |
| Role suggestions, mocks or inbox say no AI is configured | Add `GROQ_API_KEY` (free), `OPENAI_API_KEY` or `GEMINI_API_KEY` to `.env` and restart the backend. |
| GitHub analysis fails | You've hit GitHub's hourly limit. Wait, or add `GITHUB_TOKEN` to `.env`. |
| Inbox can't sign in | Use a Gmail **app password** (Google Account → Security → App passwords), not your normal password. |
| A page shows "This page couldn't load" | Click **Reload page**. If it keeps happening, the message says what failed. |
