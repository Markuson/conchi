import type { Meta, StoryObj } from '@storybook/react';

import { DrumRoller } from './DrumRoller';

const meta: Meta<typeof DrumRoller> = {
  title: 'Atoms/DrumRoller',
  component: DrumRoller,
};

export default meta;

type Story = StoryObj<typeof DrumRoller>;

const CATEGORY_OPTIONS = [
  { label: 'Alimentació', value: 'Alimentació' },
  { label: 'Transport', value: 'Transport' },
  { label: 'Oci', value: 'Oci' },
];

export const Default: Story = {
  args: {
    label: 'Categoria',
    options: CATEGORY_OPTIONS,
    selected: 'Transport',
    onChange: () => {},
  },
};

export const Warning: Story = {
  args: {
    label: 'Categoria',
    options: CATEGORY_OPTIONS,
    selected: 'Alimentació',
    onChange: () => {},
    warning: true,
  },
};
