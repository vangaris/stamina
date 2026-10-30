/** Tailwind theme variable for a semantic token, or undefined when Tailwind has no use for it. */
export function tailwindName(path: string[]): string | undefined {
  const [group, ...rest] = path;
  const name = rest.join('-');
  switch (group) {
    case 'color':
      return `--color-${name}`;
    case 'radius':
      return `--radius-${name}`;
    case 'space':
      return `--spacing-${name}`;
    case 'font':
      if (rest[0] === 'family') return `--font-${rest.slice(1).join('-')}`;
      if (rest[0] === 'size') return `--text-${rest.slice(1).join('-')}`;
      if (rest[0] === 'leading') return `--text-${rest.slice(1).join('-')}--line-height`;
      return undefined;
    case 'duration':
      return name === 'base' ? '--default-transition-duration' : undefined;
    default:
      return undefined;
  }
}
