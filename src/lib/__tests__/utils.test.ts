import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should resolve conflicting classes
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle object syntax', () => {
    const result = cn('base', { active: true, disabled: false });
    expect(result).toBe('base active');
  });

  it('should handle array syntax', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle complex tailwind class merging', () => {
    const result = cn(
      'text-red-500 bg-blue-100 p-4',
      'text-green-500 p-2'
    );
    expect(result).toBe('bg-blue-100 text-green-500 p-2');
  });

  it('should handle responsive classes', () => {
    const result = cn('md:px-4', 'lg:px-8', 'md:px-2');
    expect(result).toBe('lg:px-8 md:px-2');
  });
});
