export type Operation = 'create' | 'update' | 'delete'

export type UrlBuilderArgs = {
  /** Base pública do seu site, ex: https://clinica.exemplo.com */
  baseUrl?: string
  /** Documento atual (em delete, pode ser o doc prévio) */
  doc: any
  /** Request do Payload (contém req.payload.logger) */
  req: any
  /** Slug da collection */
  collectionSlug: string
  /** Operação */
  operation: Operation
}

export interface PayloadPluginCloudflarePurge {
  /** Ativa/desativa o plugin sem desinstalar */
  enabled?: boolean
  /** Zone ID da Cloudflare (fallback env) */
  zoneId?: string
  /** API token da Cloudflare (fallback env) */
  apiToken?: string
  /** Base pública do site; repassada ao urlBuilder */
  baseUrl?: string
  /** Quais collections recebem os hooks; 'ALL' aplica em todas */
  collections?: string[] | 'ALL'
  /** Quais eventos acionarão purge (padrão: afterChange e afterDelete) */
  events?: Array<'afterChange' | 'afterDelete'>
  /** Se true (ou função que retorne true), dispara purgeEverything */
  purgeEverything?: boolean | ((args: UrlBuilderArgs) => boolean)
  /** Função que retorna as URLs a purgar */
  urlBuilder?: (args: UrlBuilderArgs) => string[]
  /** Log extra de depuração */
  debug?: boolean
  /** Logar JSON completo da CF quando debug estiver ativo */
  logCFJSON?: boolean
  useEndpoint?: boolean // Nova opção para usar endpoint
}
