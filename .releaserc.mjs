export default {
  branches: ['master'],
  tagFormat: 'release-v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ],
  hooks: {
    parseTag: (tag) => tag.replace(/^release-v/, '')
  }
};