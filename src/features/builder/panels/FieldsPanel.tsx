import {
  AlignLeft,
  CalendarDays,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  PenLine,
  Type,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { FieldType } from '@/types/doc';
import { PanelCard } from './PanelCard';

const FIELDS: { type: FieldType; title: string; hint: string; icon: ReactNode }[] = [
  { type: 'text', title: 'Short text', hint: 'A name, email, or phone', icon: <Type size={20} /> },
  {
    type: 'longtext',
    title: 'Long text',
    hint: 'A message or comment',
    icon: <AlignLeft size={20} />,
  },
  {
    type: 'dropdown',
    title: 'Dropdown',
    hint: 'Pick one from a list',
    icon: <ChevronDownSquare size={20} />,
  },
  {
    type: 'checkbox',
    title: 'Checkbox',
    hint: 'Pick any that apply',
    icon: <CheckSquare size={20} />,
  },
  { type: 'radio', title: 'Radio', hint: 'Pick exactly one', icon: <CircleDot size={20} /> },
  { type: 'date', title: 'Date', hint: 'Choose a day', icon: <CalendarDays size={20} /> },
  {
    type: 'signature',
    title: 'Signature',
    hint: 'Draw, type, or upload',
    icon: <PenLine size={20} />,
  },
  {
    type: 'file',
    title: 'File upload',
    hint: 'Photo, PDF, or document',
    icon: <Upload size={20} />,
  },
];

export function FieldsPanel() {
  return (
    <div className="flex flex-col gap-2">
      {FIELDS.map((field) => (
        <PanelCard
          key={field.type}
          kind={`field-${field.type}`}
          icon={field.icon}
          title={field.title}
          hint={field.hint}
        />
      ))}
    </div>
  );
}
