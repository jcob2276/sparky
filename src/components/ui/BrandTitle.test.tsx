import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandTitle } from './BrandTitle';

describe('BrandTitle', () => {
  it('renders the Sparky product name', () => {
    const { container } = render(<BrandTitle />);

    expect(container).toHaveTextContent('Sparky');
    expect(container).not.toHaveTextContent('Vanguard');
  });
});
