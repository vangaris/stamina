// The squash commit message is the PR title, so the title is what gets linted.
// `feat: 01 Walking skeleton` is the house style for ticket PRs, hence no subject-case rule.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
