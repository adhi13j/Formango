import {
  Circle,
  Heading1,
  Heading2,
  Minus,
  Pilcrow,
  RectangleHorizontal,
  Square,
} from 'lucide-react';
import { PanelCard } from './PanelCard';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ElementsPanel() {
  return (
    <div className="flex flex-col gap-5">
      <Section title="Text">
        <PanelCard
          kind="heading"
          icon={<Heading1 size={20} />}
          title="Heading"
          hint="Large and bold"
        />
        <PanelCard
          kind="subheading"
          icon={<Heading2 size={20} />}
          title="Subheading"
          hint="A section title"
        />
        <PanelCard
          kind="body"
          icon={<Pilcrow size={20} />}
          title="Body text"
          hint="Regular paragraph"
        />
      </Section>
      <Section title="Shapes">
        <PanelCard kind="rect" icon={<Square size={20} />} title="Rectangle" />
        <PanelCard
          kind="rounded-rect"
          icon={<RectangleHorizontal size={20} />}
          title="Rounded rectangle"
        />
        <PanelCard kind="ellipse" icon={<Circle size={20} />} title="Circle or ellipse" />
        <PanelCard kind="line" icon={<Minus size={20} strokeWidth={3} />} title="Line" />
      </Section>
      <Section title="Divider">
        <PanelCard
          kind="divider"
          icon={<Minus size={20} />}
          title="Thin divider"
          hint="A subtle separator"
        />
      </Section>
    </div>
  );
}
