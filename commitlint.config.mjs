// Commit message rules from the team's Angular 21 + AWS Amplify developer guide.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore', 'style']],
    'header-max-length': [2, 'always', 100],
    'scope-empty': [1, 'never'],
    'body-max-line-length': [1, 'always', 72],
  },
};
