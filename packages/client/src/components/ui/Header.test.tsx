import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header.js';

describe('Header', () => {
  it('starts over on a plain click of the logo, but leaves modified clicks to the browser', () => {
    const onStartOver = vi.fn();
    render(<Header theme="system" onThemeChange={vi.fn()} onStartOver={onStartOver} />);
    const logo = screen.getByRole('link', { name: /Vayu Mitra/ });
    fireEvent.click(logo, { ctrlKey: true });
    expect(onStartOver).not.toHaveBeenCalled();
    fireEvent.click(logo);
    expect(onStartOver).toHaveBeenCalledOnce();
  });
});
