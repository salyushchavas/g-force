// Single source of truth for site content.
// Anything marked `sample: true` is placeholder proof awaiting real, permissioned content from G-Force
// (see PRODUCT.md "Truth rules"). Items marked `confirm` need client confirmation before launch;
// `confirmed: false` keeps the UI that depends on them in its cautious state until G-Force confirms.
// Visible copy writes "G‑Force" and "Wi‑Fi" with U+2011 (non-breaking hyphen) so they never split across
// lines; Archivo draws it with the same glyph as "-". Metadata (legalName, JSON-LD, titles) keeps the plain hyphen.

export const company = {
  legalName: 'G-FORCE IT SERVICES INC.',
  name: 'G-Force IT',
  tagline: 'Learn, gain and sustain your career in IT',
  url: 'https://www.gforceit.ca',
  email: 'info@gforceit.ca',
  phoneDisplay: '+1 (825) 606-9777',
  phoneHref: 'tel:+18256069777',
  address: {
    street: '130 King Street West, Suite 1900',
    city: 'Toronto',
    region: 'ON',
    postal: 'M5X 1E3',
    country: 'CA',
  },
  // Published on the current site as "9:00 AM - 6:00 PM (MST)". Shown with the Eastern equivalent. confirm
  // Until confirmed, the hours are shown as published but drive no live "Open now / Closed now" badge.
  hours: {
    days: 'Monday to Friday',
    local: '9 a.m. to 6 p.m. MT',
    eastern: '11 a.m. to 8 p.m. ET',
    schema: ['Mo-Fr 11:00-20:00'],
    confirmed: false,
  },
  geo: { lat: 43.6486, lng: -79.3825 },
  // Optional integrations, set at build time. Without them, forms fall back to a pre-filled email.
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT ?? '',
  bookingUrl: import.meta.env.PUBLIC_BOOKING_URL ?? '',
};

export const nav = [
  { label: 'For businesses', href: '/business/' },
  { label: 'Training', href: '/training/' },
  { label: 'IT health check', href: '/it-health-check/' },
  { label: 'Resources', href: '/blog/' },
  { label: 'Contact', href: '/contact/' },
];

export const hero = {
  lines: ['Proactive IT support.', 'Practical IT training.'],
  sub: 'Managed IT, cybersecurity and cloud support for Toronto businesses. Hands-on training for professionals building a career in IT.',
  // Phones: the one line of context under the glass name when the full sub-copy does not fit.
  subShort: 'Managed IT for Toronto businesses. Hands-on training for your career in IT.',
  primary: { label: 'Book a free IT assessment', href: '/contact/?interest=assessment#contact-form' },
  secondary: { label: 'Explore training', href: '/training/' },
  reassurance: ['30 minutes', 'No sales pitch', 'You keep the written report'], // confirm: proposed offer terms
  // Unverified client figure (PRODUCT.md truth rules): marked Sample until G-Force confirms it and its method.
  stat: {
    value: 90,
    suffix: '%',
    label: 'fewer outages for managed clients',
    confirmed: false,
    footnote: 'Sample figure. G‑Force will publish how outages are counted with the confirmed figure.', // confirm
  },
};

export const paths = {
  business: {
    title: 'For businesses',
    heading: 'Reliable IT support for your business',
    body: 'A dedicated team for monitoring, cybersecurity, cloud, backups and help-desk support. Clear priorities, a named contact and a written plan.',
    points: ['Monitoring and patching', 'Cybersecurity assessments', 'Cloud and tested backups', 'Help desk your staff can reach'],
    cta: { label: 'See business services', href: '/business/' },
  },
  learners: {
    title: 'For career switchers and learners',
    heading: 'Build your career in IT',
    body: 'Instructor-led programs in Cloud, Cybersecurity, AI and Machine Learning, Data and DevOps. Learn online, in person or at your own pace.',
    points: ['Five career tracks', 'Virtual, in-person or self-paced', 'Aligned to industry certifications', 'Career guidance as you learn'],
    cta: { label: 'Find your course', href: '/training/#course-finder' },
  },
};

export type Service = {
  id: string;
  name: string;
  summary: string;
  details: string[];
  href: string;
  video: string; // media slot
  icon: 'monitor' | 'shield' | 'cloud' | 'cap' | 'compass';
};

export const services: Service[] = [
  {
    id: 'managed-it',
    name: 'Managed IT',
    summary: 'Monitoring, patching, help desk and vendor management under one contract.',
    details: [
      'Proactive monitoring and alerting for servers, laptops and network gear',
      'Scheduled software updates with clear reporting',
      'Help-desk support with documented response targets',
      'Coordinated vendor and licence management',
    ],
    href: '/business/#managed-it',
    video: 'svc-managed-it',
    icon: 'monitor',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    summary: 'Risk assessments, endpoint protection, email security and staff awareness training.',
    details: [
      'Security assessment against the Canadian Centre for Cyber Security baseline controls',
      'Multi-factor authentication and endpoint protection rollout',
      'Phishing awareness training for staff',
      'Incident response planning and practical team exercises',
    ],
    href: '/business/#cybersecurity',
    video: 'svc-cybersecurity',
    icon: 'shield',
  },
  {
    id: 'cloud-backup',
    name: 'Cloud and backup',
    summary: 'Planned migrations to AWS, Azure or Google Cloud, supported by regularly tested backups.',
    details: [
      'Planned migrations with a rollback path',
      'Backups for files, email and servers',
      'Quarterly restore tests, with the results sent to you',
      'Data kept in Canadian regions where your provider supports it',
    ],
    href: '/business/#cloud-backup',
    video: 'svc-cloud-backup',
    icon: 'cloud',
  },
  {
    id: 'training',
    name: 'IT training',
    summary: 'Five career tracks taught by practitioners. Virtual, in-person or self-paced.',
    details: [
      'Cloud, Cybersecurity, AI and Machine Learning, Data, DevOps',
      'Hands-on labs and real project work',
      'Preparation for recognized certification exams',
      'Upskilling for your own staff',
    ],
    href: '/training/',
    video: 'svc-training',
    icon: 'cap',
  },
  {
    id: 'consulting',
    name: 'IT consulting',
    summary: 'Cloud strategy, automation and security reviews, scoped and priced before work starts.',
    details: [
      'Cloud migration planning and cost reviews',
      'Automation of repetitive admin work',
      'Security and compliance readiness reviews',
      'Custom software and data projects',
    ],
    href: '/business/#consulting',
    video: 'svc-consulting',
    icon: 'compass',
  },
];

// A real sequence, so numbered markers are earned here (DESIGN.md). Timings are the proposed standard. confirm
// The PDF's Assess → Plan → Implement → Monitor → Support timeline, worded from the original site (index.html,
// services.html). No timings or deliverables: the original states none.
export const process = [
  { step: 'Assess', body: 'A thorough assessment of your systems and security, so you stay ahead of potential risks.' },
  { step: 'Plan', body: 'Tailored solutions designed to meet your current needs and future goals.' },
  { step: 'Implement', body: 'Network support and security strategies put in place across your on-premises and cloud environments.' },
  { step: 'Monitor', body: 'With our dedicated oversight, you can focus on your core operations while your technology runs smoothly.' },
  { step: 'Support', body: 'Reliable technical support that resolves issues quickly, keeping downtime to a minimum.' },
];

// Sample figures for layout. Replace with real, dated numbers (see PRODUCT.md).
export const stats = {
  sample: true,
  items: [
    { value: 120, suffix: '+', label: 'businesses supported', note: 'Sample figure' },
    { value: 450, suffix: '+', label: 'learners trained', note: 'Sample figure' },
    { value: 99.9, suffix: '%', decimals: 1, label: 'monitored uptime', note: 'Sample figure' },
    { value: 15, suffix: ' min', label: 'median first response', note: 'Sample figure' },
  ],
};

// Original "Our clients" list, restored at the user's explicit request.
// Reuse its earlier prepared transparent marks as requested; do not add inferred clients.
export const clientLogos = [
  { file: '1.jpg', name: 'AIG' },
  { file: '2.gif', name: 'Amtrak' },
  { file: '3.jpg', name: 'Walmart' },
  { file: '4.jpg', name: 'Warner Bros.' },
  { file: '5.gif', name: 'Cardinal Health' },
  { file: '6.gif', name: 'Caterpillar' },
  { file: '7.gif', name: 'Cisco' },
  { file: '8.jpg', name: 'EDS', defunct: true },
  { file: '9.jpg', name: 'FedEx' },
  { file: '10.gif', name: 'Sprint', defunct: true },
  { file: '11.gif', name: 'Gap' },
  { file: '12.jpg', name: 'The Home Depot' },
  { file: '13.gif', name: 'HP' },
  { file: '14.gif', name: 'IBM' },
  { file: '15.gif', name: 'Inland Northwest Health Services' },
  { file: '16.gif', name: 'JPMorgan Chase' },
  { file: '17.jpg', name: 'Kaiser Permanente' },
  { file: '18.jpg', name: 'Rent-A-Center' },
  { file: '19.jpg', name: 'Mastercard' },
  { file: '20.gif', name: 'Microsoft' },
  { file: '21.jpg', name: 'Monsanto', defunct: true },
  { file: '22.jpg', name: 'Motorola' },
  { file: '23.gif', name: 'mygo Informatics' },
  { file: '24.gif', name: 'Nolan Real Estate Services' },
  { file: '25.gif', name: 'Northrop Grumman' },
  { file: '26.jpg', name: 'Oracle' },
  { file: '27.gif', name: 'Questia', defunct: true },
  { file: '28.jpg', name: 'Siemens' },
];

// Certification exam tracks taught (named on the current site). These are not partner badges.
export const certTracks = [
  'CompTIA Security+',
  'Certified Ethical Hacker (CEH)',
  'CISSP',
  'AWS Certified Cloud Practitioner',
  'Microsoft Azure Fundamentals',
  'Google Cloud Digital Leader',
];

export const testimonials = {
  sample: true,
  items: [
    {
      quote:
        'Our server used to go down a few times a month. Since G‑Force took over monitoring, the problems get fixed before we open, and I stopped being the office IT person.',
      who: 'Office manager',
      org: 'Accounting firm, 18 staff',
      initials: 'OM',
    },
    {
      quote:
        'They walked through every computer at the clinic, gave us a plain-English report, and fixed the riskiest things first. The plan matched the price we were quoted.',
      who: 'Practice owner',
      org: 'Dental clinic, Mississauga',
      initials: 'PO',
    },
    {
      quote:
        'I was working retail nights and studying after shifts. The cloud track was hands-on from week one, and the instructor helped me plan the certification exams.',
      who: 'Career switcher',
      org: 'Cloud track graduate',
      initials: 'CS',
    },
  ],
};

export const caseStudies = {
  sample: true,
  items: [
    {
      sector: 'Accounting firm',
      image: 'case-accounting',
      problem: 'Backups ran nightly but had never been restored. A failed drive during tax season would have stopped work for days.',
      solution: 'Moved files to versioned cloud backup, added offsite copies, and scheduled quarterly restore tests.',
      result: 'Full restore tested in 42 minutes. Two staff laptops recovered the same day after a spill.',
    },
    {
      sector: 'Dental clinic',
      image: 'case-clinic',
      problem: 'Wi‑Fi drops and an ageing router stalled the booking system several times a week.',
      solution: 'Replaced the network edge, separated guest Wi‑Fi, and put the gear under monitoring.',
      result: 'No booking-system outages in the following quarter.',
    },
    {
      sector: 'Manufacturer',
      image: 'case-manufacturing',
      problem: 'Shared passwords and no multi-factor authentication on email after a phishing scare.',
      solution: 'Rolled out a password manager and MFA, then ran phishing awareness training for office and shop-floor staff.',
      result: 'Every account on MFA within three weeks. Phishing-test click rate cut by more than half.',
    },
  ],
};

export type Course = {
  id: string;
  name: string;
  goal: 'cloud' | 'cybersecurity' | 'ai' | 'data' | 'devops';
  level: 'beginner' | 'intermediate' | 'advanced';
  formats: Array<'virtual' | 'in-person' | 'self-paced'>;
  summary: string;
  covers: string[];
  certs: string[];
};

// Programs named on the current site. Durations, prices and start dates: confirm.
export const courses: Course[] = [
  {
    id: 'cloud',
    name: 'Cloud Mastery',
    goal: 'cloud',
    level: 'beginner',
    formats: ['virtual', 'in-person', 'self-paced'],
    summary: 'Build, secure and run workloads on AWS, Azure and Google Cloud.',
    covers: ['Core cloud services on AWS, Azure and Google Cloud', 'Networking and identity basics', 'Cost control and monitoring'],
    certs: ['AWS Certified Cloud Practitioner', 'Microsoft Azure Fundamentals', 'Google Cloud Digital Leader'],
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity Essentials',
    goal: 'cybersecurity',
    level: 'beginner',
    formats: ['virtual', 'in-person'],
    summary: 'Defend systems, recognize threats and respond to incidents.',
    covers: ['Threats, vulnerabilities and controls', 'Network and endpoint defence', 'Incident response basics'],
    certs: ['CompTIA Security+'],
  },
  {
    id: 'cyber-advanced',
    name: 'Ethical Hacking and Security Leadership',
    goal: 'cybersecurity',
    level: 'advanced',
    formats: ['virtual'],
    summary: 'Develop practical skills in ethical hacking, security architecture and risk management.',
    covers: ['Penetration testing methodology', 'Security architecture', 'Governance and risk'],
    certs: ['Certified Ethical Hacker (CEH)', 'CISSP'],
  },
  {
    id: 'ai',
    name: 'AI and Machine Learning',
    goal: 'ai',
    level: 'intermediate',
    formats: ['virtual', 'self-paced'],
    summary: 'Train, evaluate and deploy machine learning models with Python.',
    covers: ['Python for data work', 'Supervised and unsupervised learning', 'Putting a model into production'],
    certs: [],
  },
  {
    id: 'data',
    name: 'Data Analytics and Big Data',
    goal: 'data',
    level: 'beginner',
    formats: ['virtual', 'in-person', 'self-paced'],
    summary: 'Turn raw data into dashboards and decisions with SQL, Python and Power BI.',
    covers: ['SQL and data modelling', 'Dashboards in Power BI and Tableau', 'Working with large datasets'],
    certs: [],
  },
  {
    id: 'devops',
    name: 'DevOps and Software Development',
    goal: 'devops',
    level: 'intermediate',
    formats: ['virtual', 'in-person'],
    summary: 'Ship software reliably with CI/CD, containers and infrastructure as code.',
    covers: ['Git, CI/CD with Jenkins', 'Docker and Kubernetes', 'Terraform and Ansible'],
    certs: [],
  },
];

export const learningFormats = [
  { name: 'Virtual classes', body: 'Live, instructor-led sessions you join from anywhere in Canada.' },
  { name: 'In-person workshops', body: 'Practical classroom labs with direct guidance from an instructor.' },
  { name: 'Self-paced', body: 'Structured lessons and labs to fit around a full-time job.' },
];

export const quiz = {
  questions: [
    {
      id: 'backup',
      q: 'How are your company files backed up?',
      options: [
        { label: 'No regular backup', score: 0, tip: 'Set up automatic, versioned backups with an offsite copy.' },
        { label: 'Automatic backup, never test-restored', score: 10, tip: 'Test a full restore. An untested backup is a guess.' },
        { label: 'Automatic, and restored successfully in the last 90 days', score: 20, tip: '' },
      ],
    },
    {
      id: 'mfa',
      q: 'Do staff use multi-factor authentication for email and remote access?',
      options: [
        { label: 'No', score: 0, tip: 'Turn on multi-factor authentication for email first, then for remote access.' },
        { label: 'Some accounts', score: 10, tip: 'Extend multi-factor authentication to every account, starting with admins.' },
        { label: 'Every account', score: 20, tip: '' },
      ],
    },
    {
      id: 'patching',
      q: 'How are computers and servers kept up to date?',
      options: [
        { label: 'Whenever someone remembers', score: 0, tip: 'Schedule automatic updates and track which machines are behind.' },
        { label: 'Automatic updates, nobody checks', score: 10, tip: 'Check that updates actually install; failures can go unnoticed.' },
        { label: 'Managed, with reports', score: 20, tip: '' },
      ],
    },
    {
      id: 'devices',
      q: 'If a laptop were lost tomorrow, what happens to the data on it?',
      options: [
        { label: "We'd have a real problem", score: 0, tip: 'Encrypt every laptop and enable remote wipe.' },
        { label: 'Some devices are encrypted', score: 10, tip: 'Bring every device under encryption and central management.' },
        { label: 'All encrypted and remotely wipeable', score: 20, tip: '' },
      ],
    },
    {
      id: 'support',
      q: 'When something breaks, who fixes it?',
      options: [
        { label: 'Whoever is most technical', score: 0, tip: 'Give your team a support line with response targets.' },
        { label: 'An outside tech, when available', score: 10, tip: 'Agree on response times in writing before the next outage.' },
        { label: 'A team with response targets in writing', score: 20, tip: '' },
      ],
    },
  ],
  bands: [
    { min: 75, label: 'In good shape', body: 'Your basics are covered. A review can confirm nothing has drifted.' },
    { min: 40, label: 'Exposed in places', body: 'Some essentials are in place, and a few gaps could cost you a working day.' },
    { min: 0, label: 'At risk', body: 'A single failed drive or phishing email could stop work. These fixes are quick to start.' },
  ],
};

export const calculatorDefaults = {
  people: 12,
  hourlyCost: 45,
  hoursDown: 4,
  incidentsPerYear: 3,
  revenuePerHour: 0,
};

export const faqs = [
  {
    q: 'What does the free IT assessment include?',
    a: 'A 30-minute conversation about how your team works, a review of your devices, accounts and backups, and a written report with the top risks and what fixing them would cost. You keep the report whether or not you hire us.',
  },
  {
    q: 'Do you only work with businesses in Toronto?',
    a: 'Our head office is in downtown Toronto. Monitoring, help desk and training work remotely, so we support clients across Canada, with on-site visits where it makes sense.',
  },
  {
    q: 'How quickly do you respond when something breaks?',
    a: 'Response targets are written into every managed-services agreement, so you know in advance how fast a person will pick up your issue.',
  },
  {
    q: 'Can you train our own staff, not just individual learners?',
    a: 'Yes. Any of the five tracks can be delivered to your team, online or in person, and paired with the systems you already use.',
  },
  {
    q: 'I have no IT background. Which course should I start with?',
    a: 'Most people start with Cloud Mastery or Cybersecurity Essentials. Use the course finder, or book a call and we will help you choose based on your goals.',
  },
];

export const checklist = [
  { area: 'Backups', item: 'Automatic, versioned backups of files, email and servers, with one copy offsite.' },
  { area: 'Backups', item: 'A full restore tested in the last 90 days, with the result written down.' },
  { area: 'Accounts', item: 'Multi-factor authentication on email, remote access and every admin account.' },
  { area: 'Accounts', item: 'A password manager for the team; no shared or reused passwords.' },
  { area: 'Accounts', item: 'Separate admin accounts used only for admin work.' },
  { area: 'Devices', item: 'Operating systems and apps updated automatically, with failures reported.' },
  { area: 'Devices', item: 'Full-disk encryption on every laptop, and remote wipe enabled.' },
  { area: 'Devices', item: 'Endpoint protection installed and monitored on every computer.' },
  { area: 'Network', item: 'Firewall firmware current; guest Wi‑Fi separated from business systems.' },
  { area: 'People', item: 'Phishing awareness training at least once a year, with a simple way to report suspicious email.' },
  { area: 'Plan', item: 'A one-page incident plan: who to call, what to switch off, how to tell clients.' },
  { area: 'Plan', item: 'Vendor and former-staff access reviewed every quarter.' },
];
