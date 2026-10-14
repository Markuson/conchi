import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmationCard } from './ConfirmationCard';

const meta: Meta<typeof ConfirmationCard> = {
  title: 'ConfirmationCard',
  component: ConfirmationCard,
};

export default meta;

type Story = StoryObj<typeof ConfirmationCard>;

const CATEGORIES = [
  { name: 'Alimentació', subcategories: ['Supermercat', 'Restaurant'] },
  { name: 'Transport', subcategories: ['Benzina', 'Transport públic'] },
  { name: 'Oci', subcategories: ['Cinema', 'Concerts'] },
];

const CONTEXTS = ['Casa', 'Feina', 'Vacances'];

export const ContextVisible: Story = {
  args: {
    data: {
      amount: 24.5,
      currency: 'EUR',
      category: 'Alimentació',
      subcategory: 'Supermercat',
      description: 'Compra setmanal',
      date: '2026-09-29',
      context: 'Casa',
    },
    categories: CATEGORIES,
    contexts: CONTEXTS,
    onAccept: () => {},
    onDiscard: () => {},
    onEdit: () => {},
  },
};

export const ContextHidden: Story = {
  args: {
    data: {
      amount: 12.9,
      currency: 'EUR',
      category: 'Transport',
      subcategory: 'Benzina',
      description: 'Omplert dipòsit',
      date: '2026-09-29',
    },
    categories: CATEGORIES,
    contexts: [],
    onAccept: () => {},
    onDiscard: () => {},
    onEdit: () => {},
  },
};

export const PrefilledMockData: Story = {
  args: {
    data: {
      amount: 8.4,
      currency: 'EUR',
      // Not present in `CATEGORIES` on purpose — shows the mismatched-category
      // warning (defaults to the first available category, ⚠️ + `textTertiary` label).
      category: 'Subscripcions',
      subcategory: '',
      description: 'Cafè amb els companys',
      date: '2026-09-29',
      context: 'Feina',
    },
    categories: CATEGORIES,
    contexts: CONTEXTS,
    onAccept: () => {},
    onDiscard: () => {},
    onEdit: () => {},
  },
};
