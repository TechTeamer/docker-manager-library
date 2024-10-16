import {
  type ComposePlaceholders,
  type DockerComposeConfig,
  extendCompose,
  replaceCompose,
  writeCompose,
  readFile,
} from '@/compose'
import type { DeepPartial } from '@/utils'
import Docker from 'dockerode'
import type { ContainerCreateOptions, DockerOptions } from 'dockerode'
import { v2 as compose } from 'docker-compose'
import path from 'node:path'

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
      Labels: updatedLabels,
    }

    const recreatedContainer = await this.docker.createContainer({
      ...newConfig,
      name: containerInfo.Name,
      HostConfig: containerInfo.HostConfig,
    })

    await recreatedContainer.start()

    return recreatedContainer
  }

  async containerRunCommand(id: string, command: Docker.ExecCreateOptions) {
    const container = this.getContainer(id)
    const exec = await container.exec({
      ...command,
      AttachStdout: true,
      AttachStderr: true,
    })

    return new Promise((resolve, reject) => {
      exec.start({}, (err, stream) => {
        if (err) return reject(err)
        if (!stream) return resolve(null)

        let output = ''
        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString()
        })
        stream.on('end', () => {
          resolve(output.trim())
        })
        stream.on('error', (err: Error) => {
          reject(err)
        })
      })
    })
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

  async copyTemplate(
    templatePath: string,
    outTemplatePath: string,
    placeholders?: ComposePlaceholders,
  ) {
    let composeFileContent = await readFile(templatePath)

    if (placeholders) {
      composeFileContent = replaceCompose(composeFileContent, placeholders)
    }

    await writeCompose(outTemplatePath, composeFileContent)
  }

  async composeUpdate(
    composePath: string,
    overrides: DeepPartial<DockerComposeConfig>,
  ) {
    let composeFileContent = await readFile(composePath)
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
    await compose.upAll({
      cwd: path.dirname(composePath),
      log: true,
      composeOptions: [`-f${path.basename(composePath)}`, `-p${projectName}`],
    })
  }

  async composeDown(composePath: string, projectName: string) {
    await compose.downAll({
      cwd: path.dirname(composePath),
      log: true,
      composeOptions: [`-f${path.basename(composePath)}`, `-p${projectName}`],
    })
  }
}
