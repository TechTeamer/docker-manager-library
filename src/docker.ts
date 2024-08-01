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

export class DockerManager {
  private docker: Docker

  constructor(dockerOptions?: DockerOptions) {
    this.docker = new Docker(dockerOptions)
  }

  getContainer(query: string) {
    const container = this.docker.getContainer(query)

    return container
  }

  async getContainerStatus(query: string) {
    const container = this.getContainer(query)
    const data = await container.inspect()

    return data.State
  }

  async containerStart(query: string) {
    const container = this.getContainer(query)
    await container.start()
  }

  async containerStop(query: string) {
    const container = this.getContainer(query)
    await container.stop()
  }

  async containerCreate(options: ContainerCreateOptions) {
    const container = await this.docker.createContainer(options)

    await container.start()

    return container
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

  async composeUp(composePath: string, projectName: string) {
    const compose = new DockerodeCompose(this.docker, composePath, projectName)

    await compose.pull()
    await compose.up()

    return compose
  }

  async composeDown(composePath: string, projectName: string) {
    const compose = new DockerodeCompose(this.docker, composePath, projectName)

    await compose.down()

    return compose
  }
}
