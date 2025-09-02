import type { PayloadHandler } from 'payload'
import { purgeCloudflare, redact } from './purge.js'
import type { PayloadPluginCloudflarePurge } from '../types/plugin.js'

function randomCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const purgeEndpointHandler = (
  options: Required<PayloadPluginCloudflarePurge>,
): PayloadHandler => {
  return async (req) => {
    const { payload, user, body } = req
    const correlationId = randomCorrelationId()

    const logger = payload.logger ?? console
    const info = (obj: any, msg: string) =>
      logger?.info?.call(logger, obj, msg) ?? console.log(msg, obj)
    const warn = (obj: any, msg: string) =>
      logger?.warn?.call(logger, obj, msg) ?? console.warn(msg, obj)
    const error = (obj: any, msg: string) =>
      logger?.error?.call(logger, obj, msg) ?? console.error(msg, obj)

    // Verifica autenticação (apenas para chamadas externas)
    if (req.headers.get('x-internal-call') !== 'true' && !user) {
      return Response.json(
        {
          error: 'Não autorizado',
          correlationId,
        },
        { status: 401 },
      )
    }

    try {
      const { files, purgeEverything = false } = body as {
        files?: string[]
        purgeEverything?: boolean
      }

      info(
        {
          correlationId,
          userId: user?.id,
          filesCount: files?.length,
          purgeEverything,
          internalCall: req.headers.get('x-internal-call') === 'true',
        },
        'Endpoint de purge acionado',
      )

      // Executa o purge
      const result = await purgeCloudflare(
        { files, purgeEverything },
        { zoneId: options.zoneId, apiToken: options.apiToken },
        {
          logger,
          correlationId,
          debug: options.debug,
          logCFJSON: options.logCFJSON,
        },
      )

      return Response.json({
        success: result.ok,
        correlationId,
        details: {
          status: result.status,
          filesPurged: files?.length,
          purgeEverything,
          executionTime: `${result.ms}ms`,
        },
        cloudflareResponse: options.debug ? result.cfJSON : undefined,
      })
    } catch (err) {
      error(
        {
          correlationId,
          error: err instanceof Error ? err.message : String(err),
        },
        'Erro no endpoint de purge',
      )

      return Response.json(
        {
          error: 'Falha ao executar purge',
          correlationId,
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      )
    }
  }
}
