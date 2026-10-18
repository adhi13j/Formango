import { logError } from '@/lib/logError';
import { normalizeDoc } from '@/lib/normalize';
import { parseDoc } from '@/types/doc.schema';
import type { FormDoc } from '@/types/doc';
import customerFeedback from './customer-feedback.json';
import contactForm from './contact-form.json';
import eventRegistration from './event-registration.json';
import insuranceProposal from './insurance-proposal.json';
import jobApplication from './job-application.json';
import lunchOrder from './lunch-order.json';
import newsletterSignup from './newsletter-signup.json';
import supportRequest from './support-request.json';
import weddingRsvp from './wedding-rsvp.json';

export interface Template {
  id: string;
  name: string;
  description: string;
  doc: FormDoc;
}

const SOURCES: { id: string; name: string; description: string; json: unknown }[] = [
  {
    id: 'contact-form',
    name: 'Contact form',
    description: 'Name, email, and a message',
    json: contactForm,
  },
  {
    id: 'event-registration',
    name: 'Event registration',
    description: 'Tickets, extra guests, diet, and a signature',
    json: eventRegistration,
  },
  {
    id: 'customer-feedback',
    name: 'Customer feedback',
    description: 'Rating, highlights, and comments',
    json: customerFeedback,
  },
  {
    id: 'newsletter-signup',
    name: 'Newsletter sign-up',
    description: 'A bold dark page with topics to pick',
    json: newsletterSignup,
  },
  {
    id: 'wedding-rsvp',
    name: 'Wedding RSVP',
    description: 'Elegant, with an Add guest list and meals',
    json: weddingRsvp,
  },
  {
    id: 'support-request',
    name: 'Support request',
    description: 'Priority, details, and a file upload',
    json: supportRequest,
  },
  {
    id: 'lunch-order',
    name: 'Lunch order',
    description: 'Add several items, extras, and a pickup time',
    json: lunchOrder,
  },
  {
    id: 'insurance-proposal',
    name: 'Insurance proposal info',
    description: 'Details a Development Officer needs for ANANDA',
    json: insuranceProposal,
  },
  {
    id: 'job-application',
    name: 'Job application (A4)',
    description: 'Two columns, CV upload, and a signature',
    json: jobApplication,
  },
];

/** Every template is validated with the same schema as imports, so a bad one is skipped, not loaded. */
export const TEMPLATES: Template[] = SOURCES.flatMap((source) => {
  const result = parseDoc(source.json);
  if (!result.ok) {
    logError(`template ${source.id} is invalid`, result.errors);
    return [];
  }
  // Normalizing here gives text its real height, so thumbnails match what the editor will show.
  return [
    {
      id: source.id,
      name: source.name,
      description: source.description,
      doc: normalizeDoc(result.doc),
    },
  ];
});
