import { logError } from '@/lib/logError';
import { parseDoc } from '@/types/doc.schema';
import type { FormDoc } from '@/types/doc';
import contactForm from './contact-form.json';
import eventRegistration from './event-registration.json';

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
    description: 'Tickets, diet, and a signature',
    json: eventRegistration,
  },
];

/** Every template is validated with the same schema as imports, so a bad one is skipped, not loaded. */
export const TEMPLATES: Template[] = SOURCES.flatMap((source) => {
  const result = parseDoc(source.json);
  if (!result.ok) {
    logError(`template ${source.id} is invalid`, result.errors);
    return [];
  }
  return [{ id: source.id, name: source.name, description: source.description, doc: result.doc }];
});
