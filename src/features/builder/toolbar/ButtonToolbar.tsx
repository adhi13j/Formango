import { Input } from '@/components/ui/input';
import { useDocStore } from '@/store/docStore';
import { CommonActions } from './CommonActions';
import { ColorControl, FontSelect, NumberField, Separator } from './kit';
import { commonValue, patchAll, type OfType } from './selection';

/** The submit button: its text, colors, font, and corners. */
export function ButtonToolbar({ els }: { els: OfType<'button'>[] }) {
  const single = els.length === 1 ? els[0] : undefined;
  return (
    <>
      {single && (
        <Input
          aria-label="Button text"
          key={single.id + single.label}
          defaultValue={single.label}
          maxLength={30}
          className="h-8 w-40"
          onBlur={(event) =>
            event.target.value.trim() &&
            useDocStore.getState().updateElement(single.id, { label: event.target.value.trim() })
          }
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      )}
      <ColorControl
        label="Button color"
        value={commonValue(els, (el) => el.fill)}
        onChange={(hex) => hex && patchAll(els, { fill: hex })}
      />
      <ColorControl
        label="Button text color"
        value={commonValue(els, (el) => el.textColor)}
        onChange={(hex) => hex && patchAll(els, { textColor: hex })}
      />
      <Separator />
      <FontSelect
        label="Font"
        value={commonValue(els, (el) => el.fontFamily)}
        onChange={(fontFamily) => patchAll(els, { fontFamily })}
      />
      <NumberField
        label="Font size"
        value={commonValue(els, (el) => el.fontSize)}
        min={8}
        max={40}
        onCommit={(fontSize) => patchAll(els, { fontSize })}
      />
      <NumberField
        label="Corner radius"
        suffix="Radius"
        value={commonValue(els, (el) => el.radius)}
        min={0}
        max={50}
        onCommit={(radius) => patchAll(els, { radius })}
      />
      <CommonActions els={els} />
    </>
  );
}
