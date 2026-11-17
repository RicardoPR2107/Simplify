import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo, Logomark } from './Logo';

describe('Logo', () => {
  it('el símbolo solo tiene nombre accesible "Simplify"', () => {
    render(<Logomark />);
    expect(screen.getByRole('img', { name: 'Simplify' })).toBeInTheDocument();
  });

  it('en el logo horizontal el símbolo es decorativo para no leer "Simplify" dos veces', () => {
    render(<BrandLogo />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Simplify')).toBeInTheDocument();
  });
});
