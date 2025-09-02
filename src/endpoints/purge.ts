/* eslint-disable @typescript-eslint/no-explicit-any */

type PurgeArgs = { files?: string[]; purgeEverything?: boolean };
type PurgeEnv = { zoneId?: string; apiToken?: string };
type PurgeCtx = {
  logger: any; // Pino do Payload
  correlationId: string;
  debug?: boolean;
  logCFJSON?: boolean;
};

export type PurgeResult = {
  ok: boolean;
  status: number;
  endpoint: string;
  bodySent: Record<string, any>;
  cfJSON?: any;
  ms: number;
  correlationId: string;
};

export async function purgeCloudflare(
  args: PurgeArgs,
  env: PurgeEnv,
  ctx: PurgeCtx,
): Promise<PurgeResult> {
  const { files = [], purgeEverything = false } = args;
  const zoneId = env.zoneId ?? process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = env.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;

  // Sempre objeto primeiro, msg depois (Pino)
  const info = (obj: any, msg: string) => ctx.logger?.info?.call(ctx.logger, obj, msg) ?? console.log(msg, obj);
  const warn = (obj: any, msg: string) => ctx.logger?.warn?.call(ctx.logger, obj, msg) ?? console.warn(msg, obj);
  const error = (obj: any, msg: string) => ctx.logger?.error?.call(ctx.logger, obj, msg) ?? console.error(msg, obj);

  if (!zoneId || !apiToken) {
    warn({ correlationId: ctx.correlationId }, 'Cloudflare não configurado (zoneId/apiToken ausentes). Skip purge.');
    return {
      ok: false,
      status: 0,
      endpoint: '',
      bodySent: {},
      ms: 0,
      correlationId: ctx.correlationId,
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  const body = purgeEverything ? { purge_everything: true } : { files };

  info(
    {
      correlationId: ctx.correlationId,
      zoneId: redact(zoneId),
      purgeEverything,
      filesCount: files.length,
    },
    'Iniciando purge Cloudflare',
  );

  if (ctx.debug) {
    info(
      {
        correlationId: ctx.correlationId,
        endpoint,
        body,
        tokenRedacted: redact(apiToken),
      },
      'Payload do purge (sem segredos)',
    );
  }

  const t0 = Date.now();

  let res: any;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    error({ correlationId: ctx.correlationId, error: String(e) }, 'Falha de rede ao chamar Cloudflare');
    throw e;
  }

  const ms = Date.now() - t0;

  let cfJSON: any | undefined;
  try {
    cfJSON = await res.json();
  } catch {
    /* ignore */
  }

  info(
    {
      correlationId: ctx.correlationId,
      status: res.status,
      ok: res.ok,
      ms,
    },
    'Resposta Cloudflare recebida',
  );

  if (ctx.debug && ctx.logCFJSON) {
    info({ correlationId: ctx.correlationId, cfJSON }, 'JSON Cloudflare');
  }

  if (!res.ok || (cfJSON && cfJSON.success === false)) {
    error(
      {
        correlationId: ctx.correlationId,
        status: res.status,
        cfErrors: cfJSON?.errors,
        cfMessages: cfJSON?.messages,
      },
      'Cloudflare purge NÃO confirmado',
    );
    throw new Error(`Cloudflare purge falhou: status=${res.status} id=${ctx.correlationId}`);
  }

  info({ correlationId: ctx.correlationId }, 'Cloudflare purge concluído com sucesso');

  return {
    ok: true,
    status: res.status,
    endpoint,
    bodySent: body,
    cfJSON,
    ms,
    correlationId: ctx.correlationId,
  };
}

// Util do projeto (copiado para evitar depender do host)
export function redact(secret?: string, visiblePrefix = 4, visibleSuffix = 2): string {
  if (!secret) return '';
  if (secret.length <= visiblePrefix + visibleSuffix) return '*'.repeat(secret.length);
  return `${secret.slice(0, visiblePrefix)}${'*'.repeat(secret.length - visiblePrefix - visibleSuffix)}${secret.slice(-visibleSuffix)}`;
}
