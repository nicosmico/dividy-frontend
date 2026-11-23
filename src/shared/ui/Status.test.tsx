import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Status } from './Status';

describe('Status', () => {
  it('renders its title, description and icon', () => {
    render(
      <Status
        icon={<svg data-testid='icon' />}
        title='Sin miembros'
        description='Agrega al menos dos'
      />
    );

    expect(screen.getByText('Sin miembros')).toBeInTheDocument();
    expect(screen.getByText('Agrega al menos dos')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
