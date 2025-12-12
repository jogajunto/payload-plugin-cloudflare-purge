'use client'

import { Button, Gutter, useAuth, useConfig } from '@payloadcms/ui'
import React, { useState, useCallback } from 'react'

// Um componente wrapper simples para o seu botão
export const PurgeEverythingButton = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  // 1. Pegamos o objeto 'config' que vem do hook
  const { config } = useConfig()
  // 2. Agora sim, desestruturamos 'serverURL' e 'routes' de dentro do 'config'
  const {
    serverURL,
    routes: { api },
  } = config
  const { user } = useAuth() // Pega o usuário logado para checar permissão

  const handleClick = useCallback(async () => {
    // eslint-disable-next-line no-alert
    if (
      !window.confirm(
        'Você tem certeza que quer limpar TODO o cache do site? Esta ação não pode ser desfeita.',
      )
    ) {
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const endpointURL = `${serverURL}${api}/cloudflare-purge`
      const res = await fetch(endpointURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Este é o body que o seu 'purgeEndpointHandler' está esperando!
        body: JSON.stringify({ purgeEverything: true }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao executar o purge')
      }

      setStatus('success')
      setMessage(`Sucesso! (ID: ${data.correlationId})`)
    } catch (err: Error | any) {
      setStatus('error')
      setMessage(err.message || 'Um erro desconhecido ocorreu.')
    }

    // Reseta o botão depois de 5 segundos
    setTimeout(() => setStatus('idle'), 5000)
  }, [serverURL, api])

  // Só mostra o botão se o usuário for um admin
  if (user?.roles?.includes('admin') === false) {
    return <></>
  }

  return (
    // 'Gutter' adiciona o padding lateral padrão do admin
    <Gutter right right-lg left left-lg>
      <div style={{ padding: '20px 0', borderTop: '1px solid var(--theme-border-color)' }}>
        <h3>Limpeza de Cache Cloudflare</h3>
        <p>
          Força a limpeza total (Purge Everything) de todos os arquivos no cache da Cloudflare. Use
          com moderação, pois pode deixar o site lento por alguns minutos.
        </p>
        <Button
          onClick={handleClick}
          disabled={status === 'loading'}
          el="button"
          buttonStyle="primary" // Botão primário (azul)
          icon={status === 'loading' ? 'loading' : undefined}
        >
          {status === 'idle' && 'Limpar Cache de Tudo'}
          {status === 'loading' && 'Limpando...'}
          {status === 'success' && 'Cache Limpo!'}
          {status === 'error' && 'Erro! Tentar Novamente'}
        </Button>
        {message && (
          <p
            style={{
              color:
                status === 'error' ? 'var(--palette-error-main)' : 'var(--palette-success-main)',
              marginTop: '10px',
              fontFamily: 'monospace',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </Gutter>
  )
}
