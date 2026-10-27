// Blog metadata shared by the blog index, article pages, the home "Resources" section and the 301 map.
// The four originals (blog1..4_details.html, published 22 Nov 2024) are migrated and updated; blog5 duplicated blog2.
export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  category: 'Careers' | 'Training' | 'Cybersecurity' | 'AI and automation';
  image: string; // media slot (duotone variant used on cards)
  published: string; // ISO date
  updated: string; // ISO date
  readMinutes: number; // set by the blog migration from the final word count
  legacy: string[]; // old URLs that 301 here
  // Who the article is written for; it picks the next step under the article. Defaults to 'learners'.
  audience?: 'learners' | 'business';
  // 'infographic' marks a post built around a figure (shown as a chip on its card). Defaults to 'article'.
  format?: 'article' | 'infographic';
};

/** The post's audience, defaulting to learners (every migrated article is a careers guide). */
export const audienceOf = (post?: Pick<PostMeta, 'audience'>) => post?.audience ?? 'learners';

export const posts: PostMeta[] = [
  {
    slug: 'it-skills-canadian-employers-hire-for',
    title: 'The IT skills Canadian employers are hiring for',
    excerpt: 'Cloud, security, data and automation keep showing up in job postings. Here is what each skill looks like on the job, and how to start learning it.',
    category: 'Careers',
    image: 'blog-future-jobs',
    published: '2024-11-22',
    updated: '2026-10-22',
    readMinutes: 4,
    legacy: ['/blog1_details.html'],
    format: 'infographic',
  },
  {
    slug: 'choosing-an-it-training-program',
    title: 'How to choose the right IT training program for your goals',
    excerpt: 'Start from the job you want, then check the curriculum, the format, the hands-on work and the support you get after the course ends.',
    category: 'Training',
    image: 'blog-choose-training',
    published: '2024-11-22',
    updated: '2026-10-22',
    readMinutes: 3,
    legacy: ['/blog2_details.html', '/blog5_details.html'],
  },
  {
    slug: 'building-a-career-in-cybersecurity',
    title: 'Building a career in cybersecurity',
    excerpt: 'The entry-level roles, the certifications that matter at each stage, and a realistic path from help desk to security analyst.',
    category: 'Cybersecurity',
    image: 'blog-cyber-career',
    published: '2024-11-22',
    updated: '2026-10-22',
    readMinutes: 4,
    legacy: ['/blog3_details.html'],
  },
  {
    slug: 'ai-and-automation-in-it-careers',
    title: 'How AI and automation are changing IT careers',
    excerpt: 'Automation is taking over repetitive admin work. The people who design, secure and supervise it are in more demand, not less.',
    category: 'AI and automation',
    image: 'blog-ai-automation',
    published: '2024-11-22',
    updated: '2026-10-22',
    readMinutes: 3,
    legacy: ['/blog4_details.html'],
  },
];

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

/** "Oct 22, 2026": for compact cards, where the long form pushes the read time onto a second line. */
export const formatDateShort = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
