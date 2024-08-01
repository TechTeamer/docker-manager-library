#!/bin/bash

if [ ! -d ./.git ]; then
  read -p "It is not a Git repository. Would you like to initialize it? (y/N)" gitAnswer
  case "$gitAnswer" in
    [yY])
      echo "Initializing Git repository..."
      git init
      ;;
  esac
else
  echo "It is an already initialized Git repository."
fi

if [ ! -f ./package.json ]; then
  read -p "The 'package.json' is missing. Would you like to create it by initializing an npm package? (y/N)" npmAnswer
  case "$npmAnswer" in
    [yY])
      echo "Initializing npm package..."
      pnpm init
      ;;
  esac
else
  echo "It is an already initialized npm package."
fi

pnpm install --save-dev husky commitizen cz-git @commitlint/{config-conventional,cli}
pnpx commitizen init cz-git --save-dev --save-exact


cat <<EOF > ./commitlint.config.js
// commitlint.config.js | .commitlintrc.js
/** @type {import('cz-git').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [0, 'always']
  },
  prompt: {
    alias: { fd: 'docs: fix typos' },
    messages: {
      type: 'Select the type of change that you\'re committing:',
      scope: 'Denote the SCOPE of this change (optional):',
      customScope: 'Denote the SCOPE of this change:',
      subject: 'Write a SHORT, IMPERATIVE tense description of the change:\n',
      body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
      breaking: 'List any BREAKING CHANGES (optional). Use "|" to break new line:\n',
      footerPrefixSelect: 'Select the ISSUES type of changeList by this change (optional):',
      customFooterPrefix: 'Input ISSUES prefix:',
      footer: 'List any ISSUES by this change. E.g.: #31, #34:\n',
      generatingByAI: 'Generating your AI commit subject...',
      generatedSelectByAI: 'Select suitable subject by AI generated:',
      confirmCommit: 'Are you sure you want to proceed with the commit above?'
    },
    types: [
      { value: 'feat', name: 'feat:     A new feature', emoji: ':sparkles:' },
      { value: 'fix', name: 'fix:      A bug fix', emoji: ':bug:' },
      { value: 'docs', name: 'docs:     Documentation only changes', emoji: ':memo:' },
      { value: 'style', name: 'style:    Changes that do not affect the meaning of the code', emoji: ':lipstick:' },
      { value: 'refactor', name: 'refactor: A code change that neither fixes a bug nor adds a feature', emoji: ':recycle:' },
      { value: 'perf', name: 'perf:     A code change that improves performance', emoji: ':zap:' },
      { value: 'test', name: 'test:     Adding missing tests or correcting existing tests', emoji: ':white_check_mark:' },
      { value: 'build', name: 'build:    Changes that affect the build system or external dependencies', emoji: ':package:' },
      { value: 'ci', name: 'ci:       Changes to our CI configuration files and scripts', emoji: ':ferris_wheel:' },
      { value: 'chore', name: 'chore:    Other changes that don\'t modify src or test files', emoji: ':hammer:' },
      { value: 'revert', name: 'revert:   Reverts a previous commit', emoji: ':rewind:' }
    ],
    useEmoji: false,
    emojiAlign: 'center',
    useAI: false,
    aiNumber: 1,
    themeColorCode: '',
    scopes: [],
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    customScopesAlias: 'custom',
    emptyScopesAlias: 'empty',
    upperCaseSubject: false,
    markBreakingChangeMode: false,
    allowBreakingChanges: ['feat', 'fix'],
    breaklineNumber: 100,
    breaklineChar: '|',
    skipQuestions: [],
    formatMessageCB: (answers) => {
      if (answers.breaking.length > 0) {
        if (answers.scope.length > 0) {
          answers.scope = "BREAKING," + answers.scope;
        }
        else {
          answers.scope = 'BREAKING';
        }
      }
      let output = answers.type;
      if (answers.scope.length > 0) {
        output += "(" + answers.scope + ")";
      }
      output += ":";
      // Adding tickets to the commit message.
      if (answers.footer.length > 0) {
        output += " [issues: " + answers.footer.replace(/\r\n|\n|\r/gm, '') + "]";
      }
      output += " " + answers.subject;
      if (answers.body.length > 0) {
        output += "\n\n" + answers.body;
      }
      if (answers.breaking.length > 0) {
        output += "\n\
🚧 BREAKING CHANGES 🚧:\n" + answers.breaking;
      }
      return output;
    },
    issuePrefixes: [{ value: 'refers', name: 'refers:   related ISSUES' }, { value: 'closed', name: 'closed:   ISSUES has been processed' }],
    customIssuePrefixAlign: 'top',
    emptyIssuePrefixAlias: 'skip',
    customIssuePrefixAlias: 'custom',
    allowCustomIssuePrefix: true,
    allowEmptyIssuePrefix: true,
    confirmColorize: true,
    scopeOverrides: undefined,
    defaultBody: '',
    defaultIssues: '',
    defaultScope: '',
    defaultSubject: ''
  }
}
EOF

npx husky init

read -p "Would you like to run tests before commiting? (y/N)" testsAnswer
case "$testsAnswer" in
  [yY])
    echo "Tests will run before every commit."
    echo "If they fails, so they exit with other than 0 exit code, then commiting will be prevented."
    echo "You can change the way of running tests by modifying './.husky/pre-commit' file."
    echo "By default it runs the 'npm test' command."
    echo "pnpm test" > ./.husky/pre-commit
    ;;
  *)
    echo "" > ./.husky/pre-commit
    ;;
esac

echo "npx --no -- commitlint --edit $1" > ./.husky/commit-msg

pre_commit_msg_hook="#!/bin/sh
if sh -c \": >/dev/tty\" >/dev/null 2>/dev/null; then
  exec < /dev/tty && pnpx cz --hook || true
fi"

echo "$pre_commit_msg_hook" > ./.husky/prepare-commit-msg

# jq '.config += {"cz-git": {"config": "./.cz-config.js"}}' package.json  > temp-package.json && mv temp-package.json package.json

rm make-commitizen-friendly.sh