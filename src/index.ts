import { DockerManager } from '@/docker'

const dockerManager = new DockerManager()

const newContainer = await dockerManager.containerCreate({
  Image: 'mongo:latest',
  Name: 'my-mongodb',
  ExposedPorts: {
    '27017/tcp': {},
  },
  HostConfig: {
    PortBindings: {
      '27017/tcp': [{ HostPort: '27017' }],
    },
  },
  Start: true,
  Labels: {
    example: 'label',
  },
})
export default DockerManager
