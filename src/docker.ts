import {
  type ComposePlaceholders,
  type DockerComposeConfig,
  extendCompose,
  readCompose,
  replaceCompose,
  writeCompose,
} from '@/compose'
import type { DeepPartial } from '@/utils'
import Docker from 'dockerode'
import type { ContainerCreateOptions, DockerOptions } from 'dockerode'
import DockerodeCompose from 'dockerode-compose'

type LabelFilter = {
  key: string
  value?: string
}

export class DockerManager {
  private docker: Docker

  constructor(dockerOptions?: DockerOptions) {
    this.docker = new Docker(dockerOptions)
  }

  getContainer(query: string) {
    const container = this.docker.getContainer(query)

    return container
  }

  async getContainers(all = false, status: string[] = []) {
    const containers = await this.docker.listContainers({
      all,
      filters: {
        status,
      },
    })

    return containers
  }

  async getContainerStatus(query: string) {
    const container = this.getContainer(query)
    const data = await container.inspect()

    return data.State
  }

  async getContainersByLabels(labels: LabelFilter[]) {
    const labelFilters = labels.map((label) =>
      label.value ? `${label.key}=${label.value}` : label.key,
    )

    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: labelFilters,
      },
    })

    return containers
  }

  async containerStart(query: string) {
    const container = this.getContainer(query)

    await container.start()

    return container
  }

  async containerStop(query: string) {
    const container = this.getContainer(query)

    await container.stop()

    return container
  }

  async containerCreate(options: ContainerCreateOptions & { Name: string }) {
    try {
      const container = await this.docker.createContainer(options)

      await container.start()

      return container
    } catch (error) {
      return this.getContainer(options.Name)
    }
  }

  async composeCreate(
    composePath: string,
    outComposePath: string,
    placeholders?: ComposePlaceholders,
  ) {
    let composeFileContent = await readCompose(composePath)

    if (placeholders) {
      composeFileContent = replaceCompose(composeFileContent, placeholders)
    }

    await writeCompose(outComposePath, composeFileContent)
  }

  async composeUpdate(
    composePath: string,
    overrides: DeepPartial<DockerComposeConfig>,
  ) {
    let composeFileContent = await readCompose(composePath)
    composeFileContent = extendCompose(composeFileContent, overrides)

    await writeCompose(composePath, composeFileContent)
  }

  async composeGetContainers(projectName: string) {
    const containers = await this.getContainersByLabels([
      { key: 'com.docker.compose.project', value: projectName },
    ])

    return containers
  }

  async composeUp(composePath: string, projectName: string) {
    const compose = new DockerodeCompose(this.docker, composePath, projectName)

    await compose.pull()
    await compose.up()

    return compose
  }

  async composeDown(composePath: string, projectName: string) {
    const compose = new DockerodeCompose(this.docker, composePath, projectName)

    try {
      await compose.down()
    } catch (error) {}

    const projectContainers = await this.composeGetContainers(projectName)

    for (const projectContainer of projectContainers) {
      const container = this.docker.getContainer(projectContainer.Id)

      if (projectContainer.State === 'running') {
        await container.stop()
      }

      await container.remove()
    }

    return compose
  }
}
