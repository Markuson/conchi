import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Acceptar',
    onPress: () => {},
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    label: 'Descartar',
    onPress: () => {},
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    label: 'Eliminar',
    onPress: () => {},
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    label: 'Acceptar',
    onPress: () => {},
    disabled: true,
  },
};
