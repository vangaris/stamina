import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

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
  prettier,
);
