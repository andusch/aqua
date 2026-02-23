import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from 'solid-testing-library';
import { ThemeToggle } from '../components/ThemeToggle';
import { themeState } from '../store/themeState';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render theme toggle button', () => {
    render(() => <ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeTruthy();
  });

  it('should have correct aria-label', () => {
    render(() => <ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Toggle Theme');
  });

  it('should display sun emoji for light theme', () => {
    // Force light theme
    vi.spyOn(themeState, 'theme').mockReturnValue('light');
    
    render(() => <ThemeToggle />);
    const icon = screen.getByText('☀️');
    expect(icon).toBeTruthy();
  });

  it('should display moon emoji for dark theme', () => {
    // Force dark theme
    vi.spyOn(themeState, 'theme').mockReturnValue('dark');
    
    render(() => <ThemeToggle />);
    const icon = screen.getByText('🌙');
    expect(icon).toBeTruthy();
  });

  it('should call themeState.toggle on button click', async () => {
    const toggleSpy = vi.spyOn(themeState, 'toggle');
    
    render(() => <ThemeToggle />);
    const button = screen.getByRole('button');
    
    button.click();
    
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('should have wrapper div with correct class', () => {
    const { container } = render(() => <ThemeToggle />);
    const wrapper = container.querySelector('.theme-toggle-wrapper');
    expect(wrapper).toBeTruthy();
  });

  it('should have switch button with correct class', () => {
    const { container } = render(() => <ThemeToggle />);
    const button = container.querySelector('button.theme-switch');
    expect(button).toBeTruthy();
  });

  it('should have switch-handle div', () => {
    const { container } = render(() => <ThemeToggle />);
    const handle = container.querySelector('.switch-handle');
    expect(handle).toBeTruthy();
  });

  it('should have icon span inside switch-handle', () => {
    const { container } = render(() => <ThemeToggle />);
    const icon = container.querySelector('.switch-handle .icon');
    expect(icon).toBeTruthy();
  });

  it('should set data-theme attribute based on theme state', () => {
    vi.spyOn(themeState, 'theme').mockReturnValue('light');
    
    const { container } = render(() => <ThemeToggle />);
    const button = container.querySelector('button');
    
    expect(button?.getAttribute('data-theme')).toBe('light');
  });

  it('should have correct button structure', () => {
    const { container } = render(() => <ThemeToggle />);
    const button = container.querySelector('button.theme-switch');
    const handle = button?.querySelector('.switch-handle');
    const icon = handle?.querySelector('.icon');
    
    expect(button).toBeTruthy();
    expect(handle).toBeTruthy();
    expect(icon).toBeTruthy();
  });
});
