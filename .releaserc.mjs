export default {
  branches: ['master'],
  tagFormat: 'release-v${version}',
  plugins: [
    '@semantic-release/npm',
  ],
  hooks: {
    parseTag: (tag) => tag.replace(/^release-v/, '')
  }
};