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

  getContainer(id: string) {
    const container = this.docker.getContainer(id)

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

  async getContainerStatus(id: string) {
    const container = this.getContainer(id)
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

  private async checkImageExists(imageName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.docker.listImages((err: Error | null, images) => {
        if (err) {
          return reject(err)
        }

        if (!images) return resolve(false)

        const found = images.some((image) =>
          image.RepoTags?.includes(imageName),
        )

        resolve(found)
      })
    })
  }

  private async pullImage(imageName: string) {
    return new Promise((resolve, reject) => {
      this.docker.pull(
        imageName,
        (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            return reject(err)
          }

          this.docker.modem.followProgress(stream, (err: Error | null, _) => {
            if (err) {
              return reject(err)
            }
            resolve(true)
          })
        },
      )
    })
  }

  async containerStart(id: string) {
    const container = this.getContainer(id)

    await container.start()

    return container
  }

  async containerStop(id: string) {
    const container = this.getContainer(id)

    await container.stop()

    return container
  }

  async containerCreate(
    options: ContainerCreateOptions & {
      Image: string
      Name: string
      Start?: boolean
    },
  ) {
    try {
      const imageExists = await this.checkImageExists(options.Image)

      if (!imageExists) {
        await this.pullImage(options.Image)
      }

      const container = await this.docker.createContainer(options)

      if (options.Start) {
        await container.start()
      }

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
