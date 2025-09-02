import { purgeEndpointHandler } from '../endpoints/purgeEndpointHandler.js'
import type { PayloadPluginCloudflarePurge, Operation, UrlBuilderArgs } from '../types/plugin.js'

function randomCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function draftsEnabledForCollection(collection: any): boolean {
  return !!collection?.versions?.drafts
}

function isPublishEvent(args: { collection: any; doc: any; previousDoc?: any }): boolean {
  const draftsEnabled = draftsEnabledForCollection(args.collection)
  if (!draftsEnabled) return true
  const now = args.doc?._status
  const before = args.previousDoc?._status
  return now === 'published' && before !== 'published'
}

export function makeAfterChangeHook(options: Required<PayloadPluginCloudflarePurge>) {
  return async function afterChangeHook(args: any) {
    const { req, doc, collection, operation, previousDoc } = args
    const op: Operation = operation === 'create' ? 'create' : 'update'
    const correlationId = randomCorrelationId()

    const logger = req?.payload?.logger ?? console
    const info = (o: any, m: string) => logger?.info?.call(logger, o, m) ?? console.log(m, o)
    const warn = (o: any, m: string) => logger?.warn?.call(logger, o, m) ?? console.warn(m, o)

    info(
      { correlationId, collection: collection?.slug, op, useEndpoint: options.useEndpoint },
      '[cf-purge:afterChange] Hook afterChange iniciado',
    )

    const argsForBuilder: UrlBuilderArgs = {
      baseUrl: options.baseUrl,
      doc,
      req,
      collectionSlug: collection?.slug,
      operation: op,
    }

    const purgeEverything =
      typeof options.purgeEverything === 'function'
        ? options.purgeEverything(argsForBuilder)
        : options.purgeEverything

    let files: string[] = []
    if (!purgeEverything) {
      if (!options.urlBuilder) {
        warn({ correlationId }, '[cf-purge:afterChange] urlBuilder ausente; nada para purgar')
        return doc
      }
      files = (options.urlBuilder(argsForBuilder) || []).filter(Boolean)
    }

    if (!options?.purgeEverything && !isPublishEvent({ collection, doc, previousDoc })) {
      info(
        { correlationId },
        '[cf-purge:afterChange] Mudança não é publicação (drafts ativos). Sem purge.',
      )
      return doc
    }

    if (options.useEndpoint) {
      // Usa o endpoint interno
      await callInternalPurgeEndpoint(req, {
        files,
        purgeEverything,
        correlationId,
        options,
      })
    } else {
      // Usa a função direta (comportamento antigo)
      const { purgeCloudflare } = await import('../endpoints/purge.js')
      await purgeCloudflare(
        { files, purgeEverything },
        { zoneId: options.zoneId, apiToken: options.apiToken },
        {
          logger,
          correlationId,
          debug: options.debug,
          logCFJSON: options.logCFJSON,
        },
      )
    }

    info({ correlationId }, '[cf-purge:afterChange] Hook afterChange concluído')
    return doc
  }
}

async function callInternalPurgeEndpoint(
  req: any,
  params: {
    files: string[]
    purgeEverything: boolean
    correlationId: string
    options: Required<PayloadPluginCloudflarePurge>
  },
) {
  const { files, purgeEverything, correlationId, options } = params
  const logger = req?.payload?.logger ?? console
  const info = (o: any, m: string) => logger?.info?.call(logger, o, m) ?? console.log(m, o)
  const error = (o: any, m: string) => logger?.error?.call(logger, o, m) ?? console.error(m, o)

  try {
    const payload = req.payload
    if (!payload) {
      throw new Error('Payload não disponível no request')
    }

    // Cria um request simulado para o endpoint interno
    const internalReq = {
      payload,
      user: req.user, // Passa o usuário do request original
      body: { files, purgeEverything },
      headers: req.headers,
    }

    const response = await purgeEndpointHandler(options)(internalReq as any)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Endpoint interno retornou erro: ${response.status} - ${JSON.stringify(errorData)}`,
      )
    }

    info({ correlationId, status: response.status }, 'Purge via endpoint interno concluído')
  } catch (err) {
    error(
      {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      },
      'Falha ao chamar endpoint interno de purge',
    )
    throw err
  }
}
