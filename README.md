# FaceKom Docker Manager

This library is for managing `docker` and `docker compose` services and containers.

### Features

- Container management (create, start, stop, list)
- Image pulling
- Docker Compose operations (create, update, up, down)
- Container filtering by labels

## Usage

### Docker
```ts
import { DockerManager } from '@techteamer/docker-manager-library';

const dockerManager = new DockerManager();

// Start a container
await dockerManager.containerStart('container-id');

// Create and start a new container
await dockerManager.containerCreate({
  Image: 'nginx',
  Name: 'my-nginx',
  Start: true
});

// Create and start a new container with specific options
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

console.log('New container created:', newContainer.id);

// List all running containers
const runningContainers = await dockerManager.getContainers(false, ['running']);
console.log('Running containers:', runningContainers);

// Get status of a specific container
const status = await dockerManager.getContainerStatus('container-id');
console.log('Container status:', status);

// Get container by a label
const containers = await dockerManager.getContainersByLabels({
  'com.docker.compose.service': 'web',
})
console.log('Containers:', containers);

// Update container labels
container = await dockerManager.containerUpdateLabels('container-id', {
  'com.docker.compose.service': 'test',
})

// Stop a container
await dockerManager.containerStop('container-id');
```

### Docker Compose

> [!NOTE]
> In the compose file the placeholder syntax is: `{{PLACEHOLDER}}`

```ts
import { DockerManager } from '@techteamer/docker-manager-library';

const dockerManager = new DockerManager();

// Work with Docker Compose
await dockerManager.composeUp('/path/to/docker-compose.yml', 'my-project');

// List containers associated with a Docker Compose project
const projectContainers = await dockerManager.composeGetContainers('myproject');
console.log('Project containers:', projectContainers);

// Stop and remove services defined in a Docker Compose file
await dockerManager.composeDown('./docker-compose.yml', 'myproject');

// Create a new Docker Compose file with placeholders
await dockerManager.composeCreate(
  './templates/docker-compose.yml',
  './docker-compose.yml',
  {
    DB_PASSWORD: 'mysecretpassword',
    VOLUME_PATH: '/data/myapp'
  }
);

// Update an existing Docker Compose file
await dockerManager.composeUpdate('./docker-compose.yml', {
  services: {
    webapp: {
      image: 'myapp:v2',
      environment: {
        DEBUG: 'true'
      }
    }
  }
});
```

### Options

The constructor of `DockerManager` has the following options: 

```ts
type DockerOptions = {
  socketPath?: string | undefined
  host?: string | undefined
  port?: number | string | undefined
  username?: string | undefined
  headers?: { [name: string]: string }
  ca?: string | string[] | Buffer | Buffer[] | undefined
  cert?: string | string[] | Buffer | Buffer[] | undefined
  key?: string | string[] | Buffer | Buffer[] | KeyObject[] | undefined
  protocol?: 'https' | 'http' | 'ssh' | undefined
  timeout?: number | undefined
  version?: string | undefined
  sshAuthAgent?: string | undefined
  sshOptions?: ConnectConfig | undefined
  Promise?: typeof Promise | undefined
}
```

Example:

```ts
const dockerManager = new DockerManager({ socketPath: '/var/run/docker.sock' })
```

## Development

Install the dependencies

```
pnpm i
```

To run tests

```
pnpm test