export const initialJobs = [
  {
    id: "job-101",
    title: "Senior Frontend Engineer (React / TypeScript)",
    company: "Stripe",
    logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    location: "Bengaluru, Karnataka (Remote / Hybrid)",
    postedTime: "2 hours ago",
    easyApply: true,
    salary: "₹28 - ₹42 LPA",
    matchScore: 94,
    status: "applied",
    appliedAt: "10:14:22 AM IST",
    stepsTotal: 3,
    stepsCompleted: 3,
    pacingDelaySec: 8.4,
    url: "https://www.linkedin.com/jobs/view/stripe-senior-frontend",
    llmReasoning: {
      decision: "APPLY",
      summary: "Exceptional alignment with candidate profile. Core requirements specify 4+ years React, TypeScript, high-performance UI state management, and design system ownership. Candidate resume exceeds all baseline criteria.",
      strengths: [
        "React 19 & TypeScript deep expertise matches core stack",
        "Experience building complex dashboard architectures & real-time telemetry",
        "Bengaluru hub & remote-friendly policy aligned with candidate location preferences"
      ],
      concerns: ["Mentions Ruby on Rails backend exposure, candidate has Node.js background (acceptable transferrable knowledge)"],
      screeningQuestions: [
        { question: "How many years of experience do you have with React?", answer: "5", status: "auto_filled" },
        { question: "Are you authorized to work in India?", answer: "Yes", status: "auto_filled" },
        { question: "Do you require visa sponsorship now or in the future?", answer: "No", status: "auto_filled" }
      ]
    },
    playwrightTrace: [
      { step: 1, action: "CDP: Locate job card 'Senior Frontend Engineer'", status: "success", timestamp: "10:14:12 AM IST" },
      { step: 2, action: "Click button.jobs-apply-button[aria-label*='Easy Apply']", status: "success", timestamp: "10:14:14 AM IST" },
      { step: 3, action: "Modal Step 1 (Contact Info): Verified phone (+91) & email", status: "success", timestamp: "10:14:16 AM IST" },
      { step: 4, action: "Modal Step 2 (Resume): Auto-selected candidate resume", status: "success", timestamp: "10:14:18 AM IST" },
      { step: 5, action: "Modal Step 3 (Review): Click button[aria-label='Submit application']", status: "success", timestamp: "10:14:22 AM IST" }
    ]
  },
  {
    id: "job-102",
    title: "Staff UI / Design Systems Engineer",
    company: "Linear",
    logo: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=100&auto=format&fit=crop&q=80",
    location: "Bengaluru, Karnataka (Remote)",
    postedTime: "45 mins ago",
    easyApply: true,
    salary: "₹32 - ₹48 LPA",
    matchScore: 91,
    status: "applied",
    appliedAt: "10:16:05 AM IST",
    stepsTotal: 3,
    stepsCompleted: 3,
    pacingDelaySec: 11.2,
    url: "https://www.linkedin.com/jobs/view/linear-staff-ui-engineer",
    llmReasoning: {
      decision: "APPLY",
      summary: "Linear prioritizes extreme micro-interaction precision, custom WebGL/Canvas, and keyboard-first accessibility. Candidate demonstrated strong UI perfectionism and component modularity.",
      strengths: [
        "Obsessive focus on fluid animations, latency reduction, and micro-interactions",
        "Deep knowledge of modern CSS, tokens, and component architecture",
        "Strong portfolio of modern developer tooling dashboards"
      ],
      concerns: ["High bar on past open source contributions"],
      screeningQuestions: [
        { question: "Link to public GitHub profile or interactive design portfolio", answer: "https://github.com/kalakotasubhash", status: "auto_filled" },
        { question: "Years of experience with Web Audio or Canvas API?", answer: "3", status: "auto_filled" }
      ]
    },
    playwrightTrace: [
      { step: 1, action: "CDP: Scroll into view & click listing", status: "success", timestamp: "10:15:52 AM IST" },
      { step: 2, action: "Click button.jobs-apply-button", status: "success", timestamp: "10:15:54 AM IST" },
      { step: 3, action: "Modal Step 1: Pre-filled candidate details verified", status: "success", timestamp: "10:15:57 AM IST" },
      { step: 4, action: "Modal Step 2: Injected portfolio URL into screening field", status: "success", timestamp: "10:16:01 AM IST" },
      { step: 5, action: "Modal Step 3: Verified submission acknowledgment", status: "success", timestamp: "10:16:05 AM IST" }
    ]
  },
  {
    id: "job-103",
    title: "Full Stack Engineer (AI Products & Workflows)",
    company: "Notion",
    logo: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100&auto=format&fit=crop&q=80",
    location: "Hyderabad, Telangana (Hybrid)",
    postedTime: "1 hour ago",
    easyApply: true,
    salary: "₹25 - ₹38 LPA",
    matchScore: 88,
    status: "applied",
    appliedAt: "10:17:48 AM IST",
    stepsTotal: 4,
    stepsCompleted: 4,
    pacingDelaySec: 9.8,
    url: "https://www.linkedin.com/jobs/view/notion-full-stack-ai",
    llmReasoning: {
      decision: "APPLY",
      summary: "Notion AI requires bridging frontend React workflows with streaming LLM agents, Playwright evaluation, and WebSocket telemetry. 88% direct capability match in Hyderabad.",
      strengths: [
        "Experience building AI agent control rooms and streaming LLM feeds",
        "React + Node.js backend fullstack competency",
        "Expertise in complex state management and optimistic UI updates"
      ],
      concerns: ["Candidate prefers remote-first, position mentions hybrid flexibility in HITEC City"],
      screeningQuestions: [
        { question: "Have you built production applications integrating LLMs?", answer: "Yes", status: "auto_filled" },
        { question: "Are you comfortable with Indian Standard Time (IST) working hours?", answer: "Yes", status: "auto_filled" }
      ]
    },
    playwrightTrace: [
      { step: 1, action: "CDP: Open job listing", status: "success", timestamp: "10:17:35 AM IST" },
      { step: 2, action: "Trigger Easy Apply modal via Playwright", status: "success", timestamp: "10:17:38 AM IST" },
      { step: 3, action: "Modal Step 1: Contact info confirmed", status: "success", timestamp: "10:17:40 AM IST" },
      { step: 4, action: "Modal Step 2: Resume verified", status: "success", timestamp: "10:17:42 AM IST" },
      { step: 5, action: "Modal Step 3: Answered AI experience radio button", status: "success", timestamp: "10:17:45 AM IST" },
      { step: 6, action: "Modal Step 4: Submission successful", status: "success", timestamp: "10:17:48 AM IST" }
    ]
  },
  {
    id: "job-104",
    title: "Senior Web Platform Engineer",
    company: "Vercel",
    logo: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=100&auto=format&fit=crop&q=80",
    location: "Remote, India",
    postedTime: "3 hours ago",
    easyApply: true,
    salary: "₹26 - ₹40 LPA",
    matchScore: 86,
    status: "applied",
    appliedAt: "10:19:30 AM IST",
    stepsTotal: 3,
    stepsCompleted: 3,
    pacingDelaySec: 7.9,
    url: "https://www.linkedin.com/jobs/view/vercel-web-platform",
    llmReasoning: {
      decision: "APPLY",
      summary: "Deep Next.js App Router, edge computing, server actions, and core web vitals optimization. Excellent match.",
      strengths: [
        "Vite, Next.js, and modern JS runtime internals understanding",
        "Performance optimization track record",
        "Full 100% remote across India team setup"
      ],
      concerns: ["Requires knowledge of Turborepo monorepos"],
      screeningQuestions: [
        { question: "Years of experience with Next.js?", answer: "4", status: "auto_filled" },
        { question: "Notice period required?", answer: "2 weeks", status: "auto_filled" }
      ]
    },
    playwrightTrace: [
      { step: 1, action: "Click Easy Apply", status: "success", timestamp: "10:19:18 AM IST" },
      { step: 2, action: "Select candidate resume", status: "success", timestamp: "10:19:22 AM IST" },
      { step: 3, action: "Fill Next.js experience = 4", status: "success", timestamp: "10:19:26 AM IST" },
      { step: 4, action: "Confirm and submit", status: "success", timestamp: "10:19:30 AM IST" }
    ]
  },
  {
    id: "job-105",
    title: "Lead Frontend Architect (Enterprise Cloud)",
    company: "Datadog",
    logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80",
    location: "Pune, Maharashtra (Hybrid)",
    postedTime: "5 hours ago",
    easyApply: true,
    salary: "₹30 - ₹45 LPA",
    matchScore: 82,
    status: "needs_review",
    appliedAt: null,
    stepsTotal: 4,
    stepsCompleted: 2,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/datadog-lead-frontend",
    llmReasoning: {
      decision: "FLAG_MANUAL_REVIEW",
      summary: "High skill match, but Easy Apply modal encountered a non-standard custom screening question with arbitrary salary band dropdown requiring human confirmation.",
      strengths: ["Heavy telemetry dashboards, high volume data visualization"],
      concerns: ["Mandatory 2 days/week in Pune office; requires specific non-standard salary expectations input in LPA"],
      screeningQuestions: [
        { question: "What is your target base compensation expectation in INR (LPA)?", answer: "", status: "pending_human_review" },
        { question: "Are you willing to work out of Pune office in hybrid mode?", answer: "", status: "pending_human_review" }
      ]
    },
    playwrightTrace: [
      { step: 1, action: "CDP: Open listing", status: "success", timestamp: "10:21:05 AM IST" },
      { step: 2, action: "Click Easy Apply", status: "success", timestamp: "10:21:08 AM IST" },
      { step: 3, action: "Modal Step 1: Contact info confirmed", status: "success", timestamp: "10:21:10 AM IST" },
      { step: 4, action: "Modal Step 2: Encountered unmapped custom questions. Safeguard activated: skipped crash, logged for manual review", status: "skipped_safely", timestamp: "10:21:14 AM IST" }
    ]
  },
  {
    id: "job-106",
    title: "AI Interface & Prompt Engineer",
    company: "Anthropic",
    logo: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100&auto=format&fit=crop&q=80",
    location: "Bengaluru, Karnataka / Remote",
    postedTime: "2 hours ago",
    easyApply: true,
    salary: "₹35 - ₹55 LPA",
    matchScore: 92,
    status: "shortlisted",
    appliedAt: null,
    stepsTotal: 3,
    stepsCompleted: 0,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/anthropic-ai-interface-engineer",
    llmReasoning: {
      decision: "APPLY",
      summary: "Strong candidate alignment for generative UI, model streaming components, and prompt evaluation tooling. In execution queue.",
      strengths: ["React, streaming WebSockets, high safety and prompt evaluation literacy"],
      concerns: ["Fast moving team"],
      screeningQuestions: [
        { question: "Years experience building interfaces for LLMs?", answer: "2+", status: "auto_filled" }
      ]
    },
    playwrightTrace: []
  },
  {
    id: "job-107",
    title: "Senior Product Engineer (Financial Core)",
    company: "Razorpay",
    logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80",
    location: "Bengaluru, Karnataka",
    postedTime: "6 hours ago",
    easyApply: true,
    salary: "₹26 - ₹38 LPA",
    matchScore: 89,
    status: "shortlisted",
    appliedAt: null,
    stepsTotal: 3,
    stepsCompleted: 0,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/razorpay-product-engineer",
    llmReasoning: {
      decision: "APPLY",
      summary: "High velocity fintech product engineering, fullstack React + Node. Next in batch application pipeline.",
      strengths: ["Proven track record in payment gateways, high attention to precision and data correctness"],
      concerns: ["Fast interview loop"],
      screeningQuestions: [
        { question: "Have you worked with payment integrations or high-traffic fintech flows?", answer: "Yes", status: "auto_filled" }
      ]
    },
    playwrightTrace: []
  },
  {
    id: "job-108",
    title: "Senior Mobile Engineer (Swift / iOS Native)",
    company: "Airbnb",
    logo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=100&auto=format&fit=crop&q=80",
    location: "Remote, India",
    postedTime: "7 hours ago",
    easyApply: true,
    salary: "₹28 - ₹45 LPA",
    matchScore: 42,
    status: "discarded",
    appliedAt: null,
    stepsTotal: 3,
    stepsCompleted: 0,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/airbnb-senior-ios",
    llmReasoning: {
      decision: "SKIP",
      summary: "LLM Filter Triggered: Core role requires 6+ years native Swift/Objective-C iOS development. Candidate profile is specialized in React / Web / Fullstack TypeScript. Skipping to prevent wasted application count.",
      strengths: ["Design system appreciation"],
      concerns: ["Critical stack mismatch: Swift/Objective-C vs Web Frontend"],
      screeningQuestions: []
    },
    playwrightTrace: []
  },
  {
    id: "job-109",
    title: "Senior Java / C++ High Frequency Trading Engineer",
    company: "Citadel Securities",
    logo: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=100&auto=format&fit=crop&q=80",
    location: "Mumbai, Maharashtra (Onsite)",
    postedTime: "1 day ago",
    easyApply: true,
    salary: "₹50 - ₹85 LPA",
    matchScore: 28,
    status: "discarded",
    appliedAt: null,
    stepsTotal: 3,
    stepsCompleted: 0,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/citadel-hft-engineer",
    llmReasoning: {
      decision: "SKIP",
      summary: "Mismatched domain. Low latency C++ kernel tuning required. Candidate is specialized in Web Applications.",
      strengths: [],
      concerns: ["Complete technical domain mismatch", "100% onsite in BKC Mumbai mandatory"],
      screeningQuestions: []
    },
    playwrightTrace: []
  },
  {
    id: "job-110",
    title: "Frontend Developer (Angular 1.x Legacy Migration)",
    company: "Legacy Tech Corp",
    logo: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&auto=format&fit=crop&q=80",
    location: "Chennai, Tamil Nadu (Onsite)",
    postedTime: "3 days ago",
    easyApply: true,
    salary: "₹10 - ₹14 LPA",
    matchScore: 48,
    status: "discarded",
    appliedAt: null,
    stepsTotal: 3,
    stepsCompleted: 0,
    pacingDelaySec: 0,
    url: "https://www.linkedin.com/jobs/view/legacy-angular-dev",
    llmReasoning: {
      decision: "SKIP",
      summary: "Compensation below threshold, requires 100% legacy AngularJS codebase maintenance, mismatch with candidate modern React preferences.",
      strengths: [],
      concerns: ["Below target salary band", "Legacy monolithic stack"],
      screeningQuestions: []
    },
    playwrightTrace: []
  }
];

export const initialLogs = [
  {
    id: "log-1",
    timestamp: "10:14:02 AM IST",
    type: "cdp",
    tag: "CDP CONNECTED",
    message: "Connected to Chrome DevTools Protocol at http://localhost:9222. Target tab: LinkedIn Jobs"
  },
  {
    id: "log-2",
    timestamp: "10:14:05 AM IST",
    type: "llm",
    tag: "LLM QUERY",
    message: "Scanning active job card: Stripe — 'Senior Frontend Engineer (React/TypeScript)'"
  },
  {
    id: "log-3",
    timestamp: "10:14:09 AM IST",
    type: "llm",
    tag: "MATCH: 94%",
    message: "Suitability verified: Candidate possesses 5 yrs React experience, meets 100% criteria. Decision: APPLY"
  },
  {
    id: "log-4",
    timestamp: "10:14:12 AM IST",
    type: "playwright",
    tag: "NAVIGATE",
    message: "Playwright CDP: Injected click event on button.jobs-apply-button"
  },
  {
    id: "log-5",
    timestamp: "10:14:14 AM IST",
    type: "playwright",
    tag: "MODAL STEP 1",
    message: "Contact Info Verified: +91 9876543210 / subhashkalakota@gmail.com"
  },
  {
    id: "log-6",
    timestamp: "10:14:18 AM IST",
    type: "playwright",
    tag: "RESUME ATTACH",
    message: "Attached dedicated candidate resume PDF via CDP FileChooser"
  },
  {
    id: "log-7",
    timestamp: "10:14:22 AM IST",
    type: "success",
    tag: "SUBMITTED",
    message: "Application submitted to Stripe (Bengaluru)! Emulating human reading delay: 8.4s"
  },
  {
    id: "log-8",
    timestamp: "10:15:30 AM IST",
    type: "playwright",
    tag: "PACING",
    message: "Pacing delay satisfied. Navigating to job card #2..."
  },
  {
    id: "log-9",
    timestamp: "10:15:40 AM IST",
    type: "llm",
    tag: "MATCH: 91%",
    message: "Linear — 'Staff UI / Design Systems Engineer'. Decision: APPLY"
  },
  {
    id: "log-10",
    timestamp: "10:15:58 AM IST",
    type: "playwright",
    tag: "AUTO-FILL",
    message: "Auto-filled screening question: Portfolio URL https://github.com/kalakotasubhash"
  },
  {
    id: "log-11",
    timestamp: "10:16:05 AM IST",
    type: "success",
    tag: "SUBMITTED",
    message: "Application submitted to Linear (Bengaluru)! Pacing delay: 11.2s"
  },
  {
    id: "log-12",
    timestamp: "10:17:35 AM IST",
    type: "playwright",
    tag: "PLAYWRIGHT",
    message: "Navigated to job card #3: Notion — 'Full Stack Engineer (AI Products)'"
  },
  {
    id: "log-13",
    timestamp: "10:17:48 AM IST",
    type: "success",
    tag: "SUBMITTED",
    message: "Application submitted to Notion (Hyderabad)! Pacing delay: 9.8s"
  },
  {
    id: "log-14",
    timestamp: "10:21:05 AM IST",
    type: "warn",
    tag: "SAFEGUARD SKIP",
    message: "Datadog listing encountered custom salary band screening question. Flagged for manual review (no freeze, non-blocking)."
  }
];

export const candidateProfile = {
  name: "Subhash Kalakota",
  email: "subhashkalakota@gmail.com",
  phone: "9876543210",
  phoneCountryCode: "India (+91)",
  headline: "Senior Software Engineer — React, Fullstack TypeScript & Intelligent UI Agents",
  location: "Hyderabad, Telangana / Remote",
  targetRole: "Senior / Staff Frontend & Fullstack Engineer",
  experienceYears: 5,
  skills: ["React", "TypeScript", "Next.js", "Node.js", "Playwright", "Chrome DevTools Protocol", "GraphQL", "TailwindCSS / CSS Architecture", "AI Agent Interfaces"],
  workAuthorization: "Yes",
  visaRequired: "No",
  salaryFloor: "₹22,00,000 / year (22 LPA)",
  resumeFile: null,
  resumePath: null,
  autoSubmit: true
};
