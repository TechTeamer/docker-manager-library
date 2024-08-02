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

type Labels = {
  [label: string]: string | null
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

  async getContainersByLabels(labels: Labels) {
    const label = Object.keys(labels).map((key) =>
      labels[key] ? `${key}=${labels[key]}` : key,
    )

    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label,
      },
    })

    return containers
  }

  async getContainerLabels(id: string) {
    const container = this.getContainer(id)
    const containerInfo = await container.inspect()

    return containerInfo.Config.Labels
  }

  async containerUpdateLabels(id: string, labels: Labels) {
    const container = this.getContainer(id)
    const containerInfo = await container.inspect()

    if (containerInfo.State.Running) {
      await container.stop()
    }

    await container.remove()

    const updatedLabels = { ...containerInfo.Config.Labels }

    for (const [key, value] of Object.entries(labels)) {
      if (value === null) {
        delete updatedLabels[key]
      } else {
        updatedLabels[key] = value
      }
    }

    const newConfig = {
      ...containerInfo.Config,
      Labels: {
        ...containerInfo.Config.Labels,
        ...updatedLabels,
      },
    }

    const recreatedContainer = await this.docker.createContainer({
      ...newConfig,
      name: containerInfo.Name,
      HostConfig: containerInfo.HostConfig,
    })

    await recreatedContainer.start()

    return recreatedContainer
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
    const containers = await this.getContainersByLabels({
      'com.docker.compose.project': projectName,
    })

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
