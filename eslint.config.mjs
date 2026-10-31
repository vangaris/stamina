import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

// Patterns for the "semantic tokens only" rule on UI components (see the block near the end).
const paletteClass = String.raw`(?:[\w-]+:)*-?(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|accent|caret|decoration|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d+)?(?![\w-])`;
const arbitraryColour = String.raw`\[(?:#|rgb|hsl|oklch|oklab)`;
const arbitraryLength = String.raw`\[-?\d*\.?\d+(?:px|rem|em)\]`;

const semanticClassSyntax = [
  'error',
  ...['Literal[value', 'TemplateElement[value.cooked'].flatMap((node) =>
    [`(?:^|\\s)${paletteClass}`, arbitraryColour, arbitraryLength].map((pattern) => ({
      selector: `${node}=/${pattern}/]`,
      message:
        'Class strings in components may use semantic tokens only (no palette colours, arbitrary colours or px/rem lengths).',
    })),
  ),
];

/**
 * Module boundaries (spec: "Nx tags enforce boundaries"):
 * - ui and util depend on nothing app-specific.
 * - domain depends only on util.
 * - app-core depends on domain, contracts and util.
 * - scope tags keep Vue and React apart; shared code is framework-free.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/.wrangler',
      '**/node_modules',
      '**/.nx',
      '**/coverage',
      '**/test-results',
      '**/playwright-report',
      '**/drizzle',
    ],
  },
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util'] },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:util'] },
            { sourceTag: 'type:domain', onlyDependOnLibsWithTags: ['type:domain', 'type:util'] },
            {
              sourceTag: 'type:contracts',
              onlyDependOnLibsWithTags: ['type:contracts', 'type:util'],
            },
            {
              sourceTag: 'type:app-core',
              onlyDependOnLibsWithTags: [
                'type:app-core',
                'type:domain',
                'type:contracts',
                'type:util',
              ],
            },
            { sourceTag: 'type:app' },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'scope:vue', onlyDependOnLibsWithTags: ['scope:vue', 'scope:shared'] },
            { sourceTag: 'scope:react', onlyDependOnLibsWithTags: ['scope:react', 'scope:shared'] },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: ['scope:server', 'scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    // Design system: components style themselves with semantic tokens only (docs/development.md,
    // "UI components"). Tailwind's default palette and scales are removed from the theme, so a
    // stray `bg-indigo-700` would silently render nothing; this makes it a lint error instead.
    // Checked in templates (`class`, `:class`) and in class strings kept in `<script>` constants.
    files: ['packages/ui/**/*.vue'],
    plugins: { vue },
    rules: {
      // One-word kit components (Button, Chip, Card) are the point of the kit.
      'vue/multi-word-component-names': 'off',
      'vue/no-restricted-class': [
        'error',
        `/^${paletteClass}/`,
        // Arbitrary colours and lengths bypass the tokens.
        `/${arbitraryColour}/`,
        `/${arbitraryLength}/`,
      ],
      'no-restricted-syntax': semanticClassSyntax,
    },
  },
  {
    // Class maps live in config.ts / utils (docs/development.md, "Folder shape"): same rule.
    files: ['packages/ui/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-syntax': semanticClassSyntax },
  },
  {
    // Tests mount small host components to drive a v-model or a form.
    files: ['**/*.test.ts'],
    plugins: { vue },
    rules: { 'vue/one-component-per-file': 'off' },
  },
  prettier,
);
