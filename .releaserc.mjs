export default {
  branches: ['master'],
  tagFormat: 'release-v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/github'
  ],
  hooks: {
    parseTag: (tag) => tag.replace(/^release-v/, '')
  }
};