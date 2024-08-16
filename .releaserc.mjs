export default {
  branches: ['master'],
  tagFormat: 'release-v${version}',
  plugins: [
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ],
  hooks: {
    parseTag: (tag) => tag.replace(/^release-v/, '')
  }
};