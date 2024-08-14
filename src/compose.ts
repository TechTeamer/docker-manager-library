import { promises as fs } from 'node:fs'
import { type DeepPartial, deepMerge } from '@/utils'
import yaml from 'js-yaml'

type Placeholder = string | number | boolean
export type ComposePlaceholders = Record<string, Placeholder>

type ServiceConfig = {
  container_name?: string
  image?: string
  build?:
    | string
    | {
        context: string
        dockerfile: string
      }
  ports?: string[]
  environment?: Record<string, string>
  logging?: Record<string, string>
  volumes?: string[]
  depends_on?: string[]
}

export type DockerComposeConfig = {
  version: string
  services: Record<string, ServiceConfig>
  volumes?: Record<string, null | { driver: string }>
  networks?: Record<string, null | { driver: string }>
}

export const readFile = async (filePath: string) => {
  const content = await fs.readFile(filePath, 'utf8')

  return content
}

export const replaceCompose = (
  fileContent: string,
  placeholders: ComposePlaceholders,
) =>
  fileContent.replace(
    /\{\{(\w+)\}\}/g,
    (match: string, placeholder: string) => {
      const value = placeholders[placeholder]

      return value ? String(value) : match
    },
  )

export const extendCompose = (
  fileContent: string,
  overrides: DeepPartial<DockerComposeConfig>,
) => {
  const baseConfig = yaml.load(fileContent) as DockerComposeConfig
  const extendedConfig = deepMerge(baseConfig, overrides)

  const outputYaml = yaml.dump(extendedConfig, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  })

  return outputYaml
}

export const writeCompose = async (filePath: string, fileContent: string) =>
  await fs.writeFile(filePath, fileContent)
