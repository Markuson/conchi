/**
 * Coverage for `ConfirmationCard`'s I/O matrix rows and callback contract,
 * following `Button.test.tsx`/`TextField.test.tsx`'s conventions
 * (`react-test-renderer`, manual `ThemeProvider` wrap, `act()`).
 *
 * Button/DrumRoller interactions are exercised by locating the child
 * component instance and calling the prop it was actually handed
 * (`.onPress` / `.onChange`) rather than re-simulating their own internal
 * touch mechanics — that's already covered by `Button.test.tsx` and
 * `DrumRoller.test.tsx` themselves; this file is about `ConfirmationCard`'s
 * own wiring and state logic. Finder helpers below return each match's props
 * cast to the real component prop type (`ReactTestInstance.props` is
 * untyped `any` in `react-test-renderer`'s own types) so every call site gets
 * safe, typed access instead of repeating a cast per callsite.
 */
import React from 'react';
import { Text, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import {
  ConfirmationCard,
  type ConfirmationCardData,
  type ConfirmationCardProps,
} from './ConfirmationCard';
import { Button, type ButtonProps } from './atoms/Button';
import { DrumRoller, type DrumRollerProps } from './atoms/DrumRoller';
import { ThemeProvider } from '../theme/ThemeProvider';
import type { Category } from '../lib/types/referenceData';

const CATEGORIES: Category[] = [
  { name: 'Alimentació', subcategories: ['Supermercat', 'Restaurant'] },
  { name: 'Transport', subcategories: ['Benzina'] },
];

const BASE_DATA: ConfirmationCardData = {
  amount: 10,
  currency: 'EUR',
  category: 'Alimentació',
  subcategory: 'Supermercat',
  description: 'Compra',
  date: '2026-09-29',
  context: 'Casa',
};

function renderCard(props: Partial<ConfirmationCardProps> = {}): Renderer {
  const fullProps: ConfirmationCardProps = {
    data: BASE_DATA,
    categories: CATEGORIES,
    contexts: ['Casa', 'Feina'],
    onAccept: () => {},
    onDiscard: () => {},
    onEdit: () => {},
    ...props,
  };

  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <ConfirmationCard {...fullProps} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

function findButtonProps(renderer: Renderer, label: string): ButtonProps {
  const button = renderer.root
    .findAllByType(Button)
    .find(node => (node.props as ButtonProps).label === label);
  if (!button) {
    throw new Error(`No Button found with label "${label}"`);
  }
  return button.props as ButtonProps;
}

function findDrumRollerProps(
  renderer: Renderer,
  label: string,
): DrumRollerProps<string> {
  const drum = renderer.root
    .findAllByType(DrumRoller)
    .find(node => (node.props as DrumRollerProps<string>).label === label);
  if (!drum) {
    throw new Error(`No DrumRoller found with label "${label}"`);
  }
  return drum.props as DrumRollerProps<string>;
}

function findAmountInputProps(renderer: Renderer): TextInputProps {
  return findTextInputProps(renderer, 'Import');
}

/** Locates any `TextInput` by its `accessibilityLabel` prop (set to the `TextField`'s `label`). */
function findTextInputProps(
  renderer: Renderer,
  accessibilityLabel: string,
): TextInputProps {
  const input = renderer.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === accessibilityLabel);
  if (!input) {
    throw new Error(`No TextInput found with accessibilityLabel "${accessibilityLabel}"`);
  }
  return input.props;
}

/**
 * Locates a `Pressable` by its `accessibilityLabel` prop via a structural
 * predicate rather than `findAllByType(Pressable)` — this pnpm layout
 * resolves two distinct `react-native` module instances, so the `Pressable`
 * imported here doesn't reference-match the one rendered inside
 * `ConfirmationCard` (mirrors `Button.test.tsx`'s own reasoning for avoiding
 * a direct type/prop lookup on `Pressable`).
 */
function findPressableOnPress(renderer: Renderer, label: string): () => void {
  const pressable = renderer.root.findAll(
    node =>
      (node.props as { accessibilityLabel?: unknown }).accessibilityLabel ===
        label &&
      typeof (node.props as { onPress?: unknown }).onPress === 'function',
  )[0];
  if (!pressable) {
    throw new Error(`No Pressable found with accessibilityLabel "${label}"`);
  }
  return (pressable.props as { onPress: () => void }).onPress;
}

test('renders without throwing', () => {
  expect(() => renderCard()).not.toThrow();
});

test('contexts present: the Context Drum Roller is shown with a "—" default option', () => {
  const renderer = renderCard({
    contexts: ['Casa', 'Feina'],
    data: { ...BASE_DATA, context: undefined },
  });

  const contextDrum = findDrumRollerProps(renderer, 'Context');
  expect(contextDrum.options[0]).toEqual({ label: '—', value: '—' });
  expect(contextDrum.selected).toBe('—');
});

test('contexts empty: the Context field is entirely absent', () => {
  const renderer = renderCard({ contexts: [] });

  expect(() => findDrumRollerProps(renderer, 'Context')).toThrow();
});

test('changing the category filters the subcategory options and clears the prior selection', () => {
  const renderer = renderCard({
    data: { ...BASE_DATA, category: 'Alimentació', subcategory: 'Supermercat' },
  });

  act(() => {
    findDrumRollerProps(renderer, 'Categoria').onChange('Transport');
  });

  const subcategoryDrum = findDrumRollerProps(renderer, 'Subcategoria');
  expect(subcategoryDrum.selected).toBe('');
  expect(subcategoryDrum.options).toEqual([
    { label: 'Benzina', value: 'Benzina' },
  ]);
});

test('unrecognized category defaults to the first available category and warns', () => {
  const renderer = renderCard({
    data: { ...BASE_DATA, category: 'Subscripcions', subcategory: 'Netflix' },
  });

  const categoryDrum = findDrumRollerProps(renderer, 'Categoria');
  expect(categoryDrum.selected).toBe('Alimentació');
  expect(categoryDrum.warning).toBe(true);

  // Subcategory resets accordingly, since 'Netflix' doesn't belong to 'Alimentació'.
  expect(findDrumRollerProps(renderer, 'Subcategoria').selected).toBe('');
});

test('picking a valid category clears the mismatched-category warning', () => {
  const renderer = renderCard({
    data: { ...BASE_DATA, category: 'Subscripcions', subcategory: 'Netflix' },
  });

  // Starts mismatched (defaulted to the first available category).
  expect(findDrumRollerProps(renderer, 'Categoria').warning).toBe(true);

  act(() => {
    findDrumRollerProps(renderer, 'Categoria').onChange('Transport');
  });

  expect(findDrumRollerProps(renderer, 'Categoria').warning).toBe(false);
});

test('a null amount displays as 0.00', () => {
  const renderer = renderCard({ data: { ...BASE_DATA, amount: null } });

  expect(findAmountInputProps(renderer).value).toBe('0.00');
});

test('a negative amount displays as 0.00', () => {
  const renderer = renderCard({ data: { ...BASE_DATA, amount: -15 } });

  expect(findAmountInputProps(renderer).value).toBe('0.00');
});

test('no category selected: Acceptar is disabled and an inline message is shown', () => {
  const renderer = renderCard({
    data: { ...BASE_DATA, category: '', subcategory: '' },
  });

  expect(findButtonProps(renderer, 'Acceptar').disabled).toBe(true);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children ===
          'Cal seleccionar una categoria per continuar.',
      ),
  ).toBe(true);
});

test('a valid category leaves Acceptar enabled with no inline message', () => {
  const renderer = renderCard();

  expect(findButtonProps(renderer, 'Acceptar').disabled).toBe(false);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children ===
          'Cal seleccionar una categoria per continuar.',
      ),
  ).toBe(false);
});

test('Acceptar fires onAccept with the current data', () => {
  const onAccept = jest.fn();
  const renderer = renderCard({ onAccept });

  act(() => {
    findButtonProps(renderer, 'Acceptar').onPress();
  });

  expect(onAccept).toHaveBeenCalledWith({
    amount: 10,
    currency: 'EUR',
    category: 'Alimentació',
    subcategory: 'Supermercat',
    description: 'Compra',
    date: '2026-09-29',
    context: 'Casa',
  });
});

test('Acceptar fires onAccept with context undefined (not the "—" sentinel) when unselected', () => {
  const onAccept = jest.fn();
  const renderer = renderCard({
    onAccept,
    contexts: ['Casa', 'Feina'],
    data: { ...BASE_DATA, context: undefined },
  });

  act(() => {
    findButtonProps(renderer, 'Acceptar').onPress();
  });

  expect(onAccept).toHaveBeenCalledWith({
    amount: 10,
    currency: 'EUR',
    category: 'Alimentació',
    subcategory: 'Supermercat',
    description: 'Compra',
    date: '2026-09-29',
    context: undefined,
  });
});

test('Acceptar does nothing while no category is selected', () => {
  const onAccept = jest.fn();
  const renderer = renderCard({
    onAccept,
    data: { ...BASE_DATA, category: '', subcategory: '' },
  });

  act(() => {
    findButtonProps(renderer, 'Acceptar').onPress();
  });

  expect(onAccept).not.toHaveBeenCalled();
});

test('Descartar fires onDiscard with no data', () => {
  const onDiscard = jest.fn();
  const renderer = renderCard({ onDiscard });

  act(() => {
    findButtonProps(renderer, 'Descartar').onPress();
  });

  expect(onDiscard).toHaveBeenCalledWith();
});

test('Descartar uses the danger variant and Acceptar uses the primary variant', () => {
  const renderer = renderCard();

  expect(findButtonProps(renderer, 'Descartar').variant).toBe('danger');
  expect(findButtonProps(renderer, 'Acceptar').variant).toBe('primary');
});

test('"Editar" fires onEdit with the current data and does not call onAccept', () => {
  const onEdit = jest.fn();
  const onAccept = jest.fn();
  const renderer = renderCard({ onEdit, onAccept });

  const editOnPress = findPressableOnPress(renderer, 'Editar');
  act(() => {
    editOnPress();
  });

  expect(onEdit).toHaveBeenCalledWith({
    amount: 10,
    currency: 'EUR',
    category: 'Alimentació',
    subcategory: 'Supermercat',
    description: 'Compra',
    date: '2026-09-29',
    context: 'Casa',
  });
  expect(onAccept).not.toHaveBeenCalled();
});

test('an edited amount, description, and date reach onAccept, not the original data', () => {
  const onAccept = jest.fn();
  const renderer = renderCard({ onAccept });

  act(() => {
    findAmountInputProps(renderer).onChangeText?.('42.75');
  });

  act(() => {
    findTextInputProps(renderer, 'Data').onChangeText?.('2026-10-01');
  });
  act(() => {
    findTextInputProps(renderer, 'Descripció').onChangeText?.(
      'Sopar amb amics',
    );
  });

  act(() => {
    findButtonProps(renderer, 'Acceptar').onPress();
  });

  expect(onAccept).toHaveBeenCalledWith({
    amount: 42.75,
    currency: 'EUR',
    category: 'Alimentació',
    subcategory: 'Supermercat',
    description: 'Sopar amb amics',
    date: '2026-10-01',
    context: 'Casa',
  });
});

test('a comma decimal separator in the amount is parsed, not discarded', () => {
  const onAccept = jest.fn();
  const renderer = renderCard({ onAccept });

  act(() => {
    findAmountInputProps(renderer).onChangeText?.('24,50');
  });
  act(() => {
    findButtonProps(renderer, 'Acceptar').onPress();
  });

  expect(onAccept).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 24.5 }),
  );
});

test('a non-finite amount (e.g. Infinity) is clamped to 0, not submitted as-is', () => {
  const renderer = renderCard({
    data: { ...BASE_DATA, amount: Infinity },
  });

  expect(findAmountInputProps(renderer).value).toBe('0.00');
});

test('opening one Drum Roller closes any other that was already open', () => {
  const renderer = renderCard();

  act(() => {
    findDrumRollerProps(renderer, 'Categoria').onOpenChange?.(true);
  });
  expect(findDrumRollerProps(renderer, 'Categoria').open).toBe(true);
  expect(findDrumRollerProps(renderer, 'Subcategoria').open).toBe(false);

  act(() => {
    findDrumRollerProps(renderer, 'Subcategoria').onOpenChange?.(true);
  });
  expect(findDrumRollerProps(renderer, 'Subcategoria').open).toBe(true);
  expect(findDrumRollerProps(renderer, 'Categoria').open).toBe(false);
});

test('tapping the backdrop fires onDiscard', () => {
  const onDiscard = jest.fn();
  const renderer = renderCard({ onDiscard });

  const backdropOnPress = findPressableOnPress(renderer, 'Tanca');
  act(() => {
    backdropOnPress();
  });

  expect(onDiscard).toHaveBeenCalledWith();
});
