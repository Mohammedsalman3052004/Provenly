import { APP_NAME } from '@/lib/config';

export const FAQ = [
  { q: 'What is a project portfolio dashboard?', a: `${APP_NAME} is a place to record every project you deliver (name, link, amount, dates, expenses, profit, client) and turn that record into a clean page you can share. You get weekly, monthly, quarterly and yearly progress without maintaining a spreadsheet.` },
  { q: 'Can I hide prices or clients when I share a link?', a: 'Yes. Every share link has its own list of visible fields. Hidden values are removed on the server before the page is built, so they never reach the viewer’s browser, the page source or any chart.' },
  { q: 'Can I keep different clients in different dashboards?', a: 'Yes. Create as many dashboards as you like, for example “Freelancing Projects” and one per company. Each has its own fields, projects and links. The Home page combines them into one overview.' },
  { q: 'Do I need to verify my email?', a: 'No. Sign in with Google or an email and password and you are in immediately.' },
  { q: 'Can I import the projects I already track?', a: 'Yes. Upload a CSV, match your columns to your fields and import up to thousands of rows. You can export back to CSV or a clean PDF at any time.' },
  { q: 'Is it free?', a: 'The app runs on your own free Supabase and Vercel accounts. There is nothing to pay to start.' },
];
