import yaml from 'js-yaml'

import { DockerManager } from '@/docker'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import type { DockerComposeConfig } from '@/compose'

const TEST_CONTAINER = {
  Image: 'nginx-latest',
  Name: 'nginx-test',
}

const RESOURCES = path.join(__dirname, 'resources')

const COMPOSE_PATH = path.join(RESOURCES, 'docker-compose.yml')
const OUT_COMPOSE_PATH = path.join(RESOURCES, 'test-compose.yml')

const COMPOSE_PATH_PLACEHOLDER = path.join(
  RESOURCES,
  'docker-compose-placeholder.yml',
)
const OUT_COMPOSE_PATH_PLACEHOLDER = path.join(
  RESOURCES,
  'test-compose-placeholder.yml',
)

describe('DockerManager', () => {
  let dockerManager: DockerManager

  beforeAll(() => {
    dockerManager = new DockerManager()
  })

  afterAll(async () => {
    try {
      await fs.unlink(OUT_COMPOSE_PATH)
    } catch (error) {}
    try {
      await fs.unlink(OUT_COMPOSE_PATH_PLACEHOLDER)
    } catch (error) {}
  })

  it('should create a container', async () => {
    const container = await dockerManager.containerCreate(TEST_CONTAINER)

    expect(container).toBeTruthy()
  })

  it('should start a container', async () => {
    await dockerManager.containerStart(TEST_CONTAINER.Name)
    const status = await dockerManager.getContainerStatus(TEST_CONTAINER.Name)

    expect(status.Running).toBeTruthy()
  })

  it('should list all containers', async () => {
    const containers = await dockerManager.getContainers()

    const containsNginxContainer = containers.find(
      (container) => container.Names[0] === `/${TEST_CONTAINER.Name}`,
    )

    expect(containsNginxContainer).toBeDefined()
  })

  it('should find a container by label', async () => {
    const containers = await dockerManager.getContainersByLabels([
      {
        key: 'com.docker.compose.service',
        value: 'web',
      },
    ])

    expect(containers).toHaveLength(1)
  })

  it('should stop a container', async () => {
    await dockerManager.containerStop(TEST_CONTAINER.Name)

    const status = await dockerManager.getContainerStatus(TEST_CONTAINER.Name)

    expect(status.Status).toBe('exited')
  })

  it('should create a docker-compose', async () => {
    await dockerManager.composeCreate(COMPOSE_PATH, OUT_COMPOSE_PATH)

    try {
      const stats = await fs.stat(OUT_COMPOSE_PATH)

      expect(stats.isFile()).toBe(true)
      expect(stats.size).toBeGreaterThan(0)
    } catch (error) {
      expect(error).toBeUndefined()
    }
  })

  it('should create a docker-compose with placeholders', async () => {
    await dockerManager.composeCreate(
      COMPOSE_PATH_PLACEHOLDER,
      OUT_COMPOSE_PATH_PLACEHOLDER,
      {
        EXAMPLE_PLACEHOLDER_KEY: 'NGINX_HOST',
        EXAMPLE_PLACEHOLDER_VALUE: 'localhost',
      },
    )

    const composeContent = await fs.readFile(
      OUT_COMPOSE_PATH_PLACEHOLDER,
      'utf8',
    )

    expect(composeContent.includes('NGINX_HOST: localhost')).toBe(true)
  })

  it('should update a docker-compose', async () => {
    await dockerManager.composeUpdate(OUT_COMPOSE_PATH_PLACEHOLDER, {
      services: {
        web: {
          container_name: 'nginx-intest',
          environment: {
            NGINX_HOST: '0.0.0.0',
          },
          ports: ['80:81'],
        },
      },
    })

    const composeContent = await fs.readFile(
      OUT_COMPOSE_PATH_PLACEHOLDER,
      'utf8',
    )
    const composeConfig = yaml.load(composeContent) as DockerComposeConfig

    expect(composeConfig).toHaveProperty(
      'services.web.container_name',
      'nginx-intest',
    )

    expect(composeConfig).toHaveProperty(
      'services.web.environment.NGINX_HOST',
      '0.0.0.0',
    )

    expect(composeConfig.services.web.ports?.includes('80:81')).toBe(true)
  })

  it('should up a docker-compose', async () => {
    await dockerManager.composeUp(
      OUT_COMPOSE_PATH_PLACEHOLDER,
      TEST_CONTAINER.Name,
    )

    const composeContainers = await dockerManager.composeGetContainers(
      TEST_CONTAINER.Name,
    )

    expect(
      composeContainers.every((container) => container.State === 'running'),
    ).toBe(true)
  })

  it('should down a docker-compose', async () => {
    await dockerManager.composeDown(
      OUT_COMPOSE_PATH_PLACEHOLDER,
      TEST_CONTAINER.Name,
    )

    const composeContainers = await dockerManager.composeGetContainers(
      TEST_CONTAINER.Name,
    )

    expect(composeContainers).toHaveLength(0)
  })
})
