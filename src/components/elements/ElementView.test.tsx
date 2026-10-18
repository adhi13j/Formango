import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from '@/lib/elements';
import { createBlankDoc } from '@/types/doc.schema';
import type { DocElement, FieldElement, TextElement } from '@/types/doc';
import { ElementView } from './ElementView';

const doc = createBlankDoc('mobile');
const make = <T extends DocElement>(
  kind: Parameters<typeof createElement>[0],
  patch: Partial<T> = {},
): T => ({ ...createElement(kind, doc), ...patch }) as T;

describe('ElementView in edit mode', () => {
  it('is inert: no real form controls, and it exposes its id for hit testing', () => {
    const el = make<FieldElement>('field-text');
    const { container } = render(<ElementView el={el} mode="edit" />);
    expect(container.querySelector('input, textarea, select')).toBeNull();
    expect(container.querySelector(`[data-element-id="${el.id}"]`)).not.toBeNull();
  });

  it('shows hidden elements dimmed so they can still be found', () => {
    const el = make<TextElement>('body', { hidden: true });
    const { container } = render(<ElementView el={el} mode="edit" />);
    const root = container.querySelector<HTMLElement>('[data-element-id]');
    expect(root?.style.opacity).toBe('0.3');
    expect(root?.style.pointerEvents).toBe('none');
  });

  it('lays out text as one span per line inside a heading or paragraph', () => {
    const heading = make<TextElement>('heading', { text: 'one\ntwo', width: 350 });
    const { container, rerender } = render(<ElementView el={heading} mode="edit" />);
    expect(container.querySelector('h2')?.querySelectorAll('span')).toHaveLength(2);
    rerender(<ElementView el={{ ...heading, role: 'body' }} mode="edit" />);
    expect(container.querySelector('p')).not.toBeNull();
  });

  it('positions the root with the stored geometry', () => {
    const el = make<TextElement>('body', { x: 33, y: 44, width: 200, height: 60 });
    const { container } = render(<ElementView el={el} mode="edit" />);
    const style = container.querySelector<HTMLElement>('[data-element-id]')?.style;
    expect([style?.left, style?.top, style?.width, style?.height]).toEqual([
      '33px',
      '44px',
      '200px',
      '60px',
    ]);
  });
});

describe('ElementView in preview and fill modes', () => {
  it.each(['preview', 'fill'] as const)('renders nothing for hidden elements in %s', (mode) => {
    const el = make<TextElement>('body', { hidden: true });
    const { container } = render(<ElementView el={el} mode={mode} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives a text field a real input linked to its label', async () => {
    const el = make<FieldElement>('field-text', { label: 'Your name' });
    const onAnswer = vi.fn();
    render(<ElementView el={el} mode="preview" onAnswer={onAnswer} />);
    const input = screen.getByLabelText('Your name');
    await userEvent.type(input, 'A');
    expect(onAnswer).toHaveBeenCalledWith(el.id, 'A');
  });

  it('reports an empty answer as undefined', async () => {
    const el = make<FieldElement>('field-text', { label: 'Name' });
    const onAnswer = vi.fn();
    render(<ElementView el={el} mode="preview" value="a" onAnswer={onAnswer} />);
    await userEvent.clear(screen.getByLabelText('Name'));
    expect(onAnswer).toHaveBeenLastCalledWith(el.id, undefined);
  });

  it('renders a radio group with real radios, announced by its label', async () => {
    const el = make<FieldElement>('field-radio', { label: 'Ticket', options: ['A', 'B'] });
    const onAnswer = vi.fn();
    render(<ElementView el={el} mode="fill" onAnswer={onAnswer} />);
    const group = screen.getByRole('radiogroup', { name: 'Ticket' });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onAnswer).toHaveBeenCalledWith(el.id, 'B');
  });

  it('collects checkbox answers in option order', async () => {
    const el = make<FieldElement>('field-checkbox', {
      label: 'Diet',
      options: ['Vegan', 'Gluten free', 'Nuts'],
    });
    const onAnswer = vi.fn();
    const { rerender } = render(<ElementView el={el} mode="fill" onAnswer={onAnswer} />);
    expect(screen.getByRole('group', { name: 'Diet' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nuts' }));
    expect(onAnswer).toHaveBeenLastCalledWith(el.id, ['Nuts']);
    rerender(<ElementView el={el} mode="fill" value={['Nuts']} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Vegan' }));
    expect(onAnswer).toHaveBeenLastCalledWith(el.id, ['Vegan', 'Nuts']);
  });

  it('offers the options of a dropdown and a placeholder choice', () => {
    const el = make<FieldElement>('field-dropdown', { label: 'Pick', options: ['One', 'Two'] });
    render(<ElementView el={el} mode="preview" />);
    const select = screen.getByLabelText('Pick');
    expect([...(select as HTMLSelectElement).options].map((o) => o.text)).toEqual([
      'Select an option',
      'One',
      'Two',
    ]);
  });

  it('links a validation error to the input and marks it invalid, in fill mode only', () => {
    const el = make<FieldElement>('field-text', { label: 'Email' });
    const { rerender } = render(<ElementView el={el} mode="fill" error="Enter a valid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Enter a valid email');
    rerender(<ElementView el={el} mode="preview" error="Enter a valid email" />);
    expect(screen.queryByText('Enter a valid email')).toBeNull();
  });

  it('marks required fields with a visible asterisk and the required attribute', () => {
    const el = make<FieldElement>('field-text', { label: 'Name', required: true });
    render(<ElementView el={el} mode="fill" />);
    expect(screen.getByLabelText(/Name/)).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
