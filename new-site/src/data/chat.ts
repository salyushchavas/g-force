const PHONE = { label: 'Call +1 (825) 606-9777', href: 'tel:+18256069777' };
const EMAIL = { label: 'Email info@gforceit.ca', href: 'mailto:info@gforceit.ca' };

export const TOPICS = [
  {
    id: 'urgent',
    label: 'Get help with an IT issue',
    reply: {
      from: 'bot',
      text: 'Call during business hours: Monday to Friday, 11 a.m. to 8 p.m. ET. You can also email us with a description of the issue. Existing clients should follow the support arrangements in their agreement.',
      links: [PHONE, EMAIL],
    },
  },
  {
    id: 'assessment',
    label: 'Book a free IT assessment',
    reply: {
      from: 'bot',
      text: 'The assessment is a 30-minute conversation plus a written report on your biggest IT risks. You keep the report either way.',
      links: [{ label: 'Book an assessment', href: '/contact/?interest=assessment#contact-form' }],
    },
  },
  {
    id: 'course',
    label: 'Which course is right for me?',
    reply: {
      from: 'bot',
      text: 'Most people new to IT start with Cloud Mastery or Cybersecurity Essentials. The course finder filters by goal, level and format.',
      links: [{ label: 'Open the course finder', href: '/training/#course-finder' }],
    },
  },
  {
    id: 'pricing',
    label: 'How much does managed IT cost?',
    reply: {
      from: 'bot',
      text: 'Pricing reflects your users, devices and support requirements. The free assessment helps define the scope of service and a clear quote for your business.',
      links: [{ label: 'Estimate your downtime cost', href: '/business/#downtime-calculator' }],
    },
  },
  {
    id: 'where',
    label: 'Where are you located?',
    reply: {
      from: 'bot',
      text: 'Head office: 130 King Street West, Suite 1900, Toronto. Support and training also run remotely across Canada.',
      links: [{ label: 'See contact details', href: '/contact/' }],
    },
  },
];

export const GREETING = {
  from: 'bot',
  text: 'Hi. Pick a topic for a quick answer, or leave a message and a person will reply within one business day.',
};
