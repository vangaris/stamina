import { FontPart } from '../enums/font-part.ts';
import { TokenGroup } from '../enums/token-group.ts';

/** Tailwind theme variable for a semantic token, or undefined when Tailwind has no use for it. */
export function tailwindName(path: string[]): string | undefined {
  const [group, ...rest] = path;
  const name = rest.join('-');
  switch (group) {
    case TokenGroup.Color:
      return `--color-${name}`;
    case TokenGroup.Radius:
      return `--radius-${name}`;
    case TokenGroup.Space:
      return `--spacing-${name}`;
    case TokenGroup.Font:
      if (rest[0] === FontPart.Family) return `--font-${rest.slice(1).join('-')}`;
      if (rest[0] === FontPart.Size) return `--text-${rest.slice(1).join('-')}`;
      if (rest[0] === FontPart.Leading) return `--text-${rest.slice(1).join('-')}--line-height`;
      return undefined;
    case TokenGroup.Duration:
      return name === 'base' ? '--default-transition-duration' : undefined;
    default:
      return undefined;
  }
}
