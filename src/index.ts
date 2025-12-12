/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Config } from 'payload'
import { purgeEndpointHandler } from './endpoints/purgeEndpointHandler.js'
import { makeAfterChangeHook } from './hooks/afterChangeHook.js'
import { makeAfterDeleteHook } from './hooks/afterDeleteHook.js'
import type { PayloadPluginCloudflarePurge } from './types/plugin.js'

function randomCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Type guard para verificar se uma chave é válida no tipo PayloadPluginCloudflarePurge
function isValidOptionKey(key: string): key is keyof PayloadPluginCloudflarePurge {
  const validKeys: Array<keyof PayloadPluginCloudflarePurge> = [
    'enabled',
    'zoneId',
    'apiToken',
    'baseUrl',
    'collections',
    'globals',
    'localized',
    'events',
    'purgeEverything',
    'showButtonPurgeEverything',
    'urlBuilder',
    'debug',
    'logCFJSON',
    'useEndpoint',
  ]
  return validKeys.includes(key as keyof PayloadPluginCloudflarePurge)
}

// Função para obter as chaves definidas nas options
function getDefinedOptionKeys(pluginOptions: PayloadPluginCloudflarePurge): string[] {
  return Object.keys(pluginOptions).filter(
    (key) => isValidOptionKey(key) && pluginOptions[key] !== undefined,
  )
}

export function PayloadPluginCloudflarePurge(pluginOptions: PayloadPluginCloudflarePurge = {}) {
  return function applyPlugin(incoming: Config): Config {
    const correlationId = randomCorrelationId()
    const logger = console

    const options: Required<PayloadPluginCloudflarePurge> = {
      enabled: pluginOptions.enabled ?? false,
      zoneId: pluginOptions.zoneId ?? process.env.CLOUDFLARE_ZONE_ID ?? '',
      apiToken: pluginOptions.apiToken ?? process.env.CLOUDFLARE_API_TOKEN ?? '',
      baseUrl: pluginOptions.baseUrl ?? '',
      collections: pluginOptions.collections ?? [],
      globals: pluginOptions.globals ?? [],
      localized: pluginOptions.localized ?? false,
      events: pluginOptions.events ?? ['afterChange', 'afterDelete'],
      purgeEverything: pluginOptions.purgeEverything ?? false,
      showButtonPurgeEverything: pluginOptions.showButtonPurgeEverything ?? false,
      urlBuilder: pluginOptions.urlBuilder ?? defaultUrlBuilder,
      debug: pluginOptions.debug ?? false,
      logCFJSON: pluginOptions.logCFJSON ?? false,
      useEndpoint: pluginOptions.useEndpoint ?? true,
    }

    if (options.debug) {
      logger.info(
        {
          correlationId,
          plugin: 'payload-plugin-cloudflare-purge',
          action: 'plugin_initialization_start',
          optionsProvided: getDefinedOptionKeys(pluginOptions),
        },
        '🚀 Iniciando inicialização do plugin Cloudflare Purge',
      )

      logger.info(
        {
          correlationId,
          enabled: options.enabled,
          useEndpoint: options.useEndpoint,
          events: options.events,
          collections: options.collections === 'ALL' ? 'ALL' : options.collections.length,
          globals: options.globals === 'ALL' ? 'ALL' : options.globals.length,
          hasZoneId: !!options.zoneId,
          hasApiToken: !!options.apiToken,
          baseUrl: options.baseUrl || 'not-set',
        },
        '📋 Configurações do plugin processadas',
      )
    }

    // Clona o config de entrada (padrão oficial)
    let config: Config = { ...incoming }

    if (!options.enabled) {
      logger.info(
        { correlationId },
        '⏸️  Plugin desabilitado via configuração, pulando inicialização',
      )
      return config
    }

    // Adiciona endpoints customizados
    if (options.useEndpoint) {
      if (!config.endpoints) {
        config.endpoints = []
      }

      config.endpoints.push({
        path: '/cloudflare-purge',
        method: 'post',
        handler: purgeEndpointHandler(options),
      })

      if (options.debug) {
        logger.info(
          {
            correlationId,
            endpointAdded: '/api/cloudflare-purge (POST)',
            totalEndpoints: config.endpoints.length,
          },
          '✅ Endpoint de purge adicionado',
        )
      }
    }

    // Seleção de collections alvo
    const targetCollectionSlugs = new Set(
      options.collections === 'ALL'
        ? (config.collections ?? []).map((c: any) => c.slug)
        : (options.collections as string[]),
    )

    if (options.debug) {
      logger.info(
        {
          correlationId,
          targetCollections: Array.from(targetCollectionSlugs),
          totalCollections: config.collections?.length || 0,
        },
        '🎯 Collections alvo identificadas',
      )
    }

    // ✅ INÍCIO: Seção para identificar e logar globals alvo
    const targetGlobalSlugs = new Set(
      options.globals === 'ALL'
        ? (config.globals ?? []).map((g: any) => g.slug)
        : (options.globals as string[]),
    )

    if (options.debug) {
      logger.info(
        {
          correlationId,
          targetGlobals: Array.from(targetGlobalSlugs),
          totalGlobals: config.globals?.length || 0,
        },
        '🎯 Globals alvo identificadas',
      )
    }

    let hooksAdded = 0
    config.collections = (config.collections ?? []).map((coll: any) => {
      const isTarget = targetCollectionSlugs.has(coll.slug)
      if (!isTarget) return coll

      const addAfterChange = options.events.includes('afterChange')
      const addAfterDelete = options.events.includes('afterDelete')

      const hooks = { ...(coll.hooks ?? {}) }

      if (addAfterChange) {
        const myAfterChange = makeAfterChangeHook(options)
        hooks.afterChange = [...(hooks.afterChange ?? []), myAfterChange]
        hooksAdded++
        if (options.debug) {
          logger.debug(
            {
              correlationId,
              collection: coll.slug,
              hook: 'afterChange',
            },
            `➕ Hook afterChange adicionado à collection ${coll.slug}`,
          )
        }
      }

      if (addAfterDelete) {
        const myAfterDelete = makeAfterDeleteHook(options)
        hooks.afterDelete = [...(hooks.afterDelete ?? []), myAfterDelete]
        hooksAdded++
        if (options.debug) {
          logger.debug(
            {
              correlationId,
              collection: coll.slug,
              hook: 'afterDelete',
            },
            `➕ Hook afterDelete adicionado à collection ${coll.slug}`,
          )
        }
      }

      return { ...coll, hooks }
    })

    // ✅ INÍCIO: Seção para injetar hooks nos globals alvo
    config.globals = (config.globals ?? []).map((glob: any) => {
      const isTarget = targetGlobalSlugs.has(glob.slug)
      if (!isTarget) return glob

      const addAfterChange = options.events.includes('afterChange')

      const hooks = { ...(glob.hooks ?? {}) }

      if (addAfterChange) {
        const myAfterChange = makeAfterChangeHook(options)
        hooks.afterChange = [...(hooks.afterChange ?? []), myAfterChange]
        hooksAdded++
        if (options.debug) {
          logger.debug(
            {
              correlationId,
              global: glob.slug,
              hook: 'afterChange',
            },
            `➕ Hook afterChange adicionado ao global ${glob.slug}`,
          )
        }
      }

      return { ...glob, hooks }
    })

    if (options.showButtonPurgeEverything) {
      if (!config.admin) {
        config.admin = {}
      }

      if (!config.admin.components) {
        config.admin.components = {}
      }

      if (!config.admin.components.afterDashboard) {
        config.admin.components.afterDashboard = []
      }

      config.admin.components.afterDashboard.push(
        `payload-plugin-cloudflare-purge/client#PurgeEverythingButton`,
      )

      if (options.debug) {
        logger.info(
          {
            correlationId,
            action: 'admin_component_added',
            component: 'PurgeEverythingButton',
            location: 'afterDashboard',
          },
          '🔘 Botão de Purge adicionado ao Dashboard',
        )
      }
    }

    // Extende onInit sem quebrar a existente (boa prática)
    const prevOnInit = config.onInit
    config.onInit = async (payload) => {
      const initCorrelationId = randomCorrelationId()

      if (options.debug) {
        payload.logger.info(
          {
            correlationId: initCorrelationId,
            plugin: 'payload-plugin-cloudflare-purge',
            action: 'onInit_start',
            hooksAdded,
            targetCollections: Array.from(targetCollectionSlugs),
            targetGlobals: Array.from(targetGlobalSlugs), // ✅ NOVO: Log
            useEndpoint: options.useEndpoint,
          },
          '🔧 Plugin executando onInit',
        )
      }

      if (typeof prevOnInit === 'function') {
        if (options.debug) {
          payload.logger.debug(
            { correlationId: initCorrelationId, action: 'calling_previous_onInit' },
            '🔄 Executando onInit anterior',
          )
        }
        await prevOnInit(payload)
      }

      if (options.debug) {
        payload.logger.info(
          {
            correlationId: initCorrelationId,
            plugin: 'payload-plugin-cloudflare-purge',
            action: 'onInit_complete',
            status: 'success',
          },
          '✅ Plugin inicializado com sucesso',
        )
      }
    }

    if (options.debug) {
      logger.info(
        {
          correlationId,
          hooksAdded,
          targetCollectionsCount: targetCollectionSlugs.size,
          targetGlobalsCount: targetGlobalSlugs.size, // ✅ NOVO: Log
          useEndpoint: options.useEndpoint,
          status: 'complete',
        },
        '🎉 Plugin Cloudflare Purge configurado com sucesso',
      )
    }

    return config
  }
}

/**
 * Default urlBuilder — tenta inferir uma URL a partir de `slug`/`path`.
 */
function defaultUrlBuilder({ baseUrl, doc }: { baseUrl?: string; doc: any }): string[] {
  const urls: string[] = []
  const base = (baseUrl ?? '').replace(/\/+$/, '') // sem / no final
  const path =
    typeof doc?.path === 'string'
      ? doc.path
      : typeof doc?.slug === 'string'
        ? `/${doc.slug}`
        : doc?.id
          ? `/${doc.id}`
          : '/'

  if (base) {
    const url = `${base}${path}`
    urls.push(url)

    // Log apenas se estiver em debug mode
    if (typeof process !== 'undefined' && process.env.DEBUG) {
      console.debug(
        {
          plugin: 'payload-plugin-cloudflare-purge',
          action: 'default_url_builder',
          baseUrl: base,
          docPath: doc?.path,
          docSlug: doc?.slug,
          docId: doc?.id,
          generatedUrl: url,
        },
        '🔗 URL gerada pelo urlBuilder padrão',
      )
    }
  }

  return urls
}
