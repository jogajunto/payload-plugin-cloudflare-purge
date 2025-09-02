import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  const { totalDocs: totalUsers } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalUsers) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })

    console.log('✅ Usuário dev criado:', devUser.email)
  } else {
    console.log('ℹ️  Usuário dev já existe:', devUser.email)
  }

  // Verifica se já existem posts
  const { totalDocs: totalPosts } = await payload.count({
    collection: 'posts',
  })

  if (totalPosts === 0) {
    // Cria 3 posts de exemplo com estrutura Lexical mínima
    const samplePosts = [
      {
        title: 'Primeiro Post de Exemplo',
        content: {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Este é o conteúdo do primeiro post de exemplo criado pelo seed.',
                    version: 1,
                  },
                ],
              },
            ],
          },
        },
      },
      {
        title: 'Segundo Post com Conteúdo Interessante',
        content: {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Conteúdo interessante do segundo post criado automaticamente.',
                    version: 1,
                  },
                ],
              },
            ],
          },
        },
      },
      {
        title: 'Terceiro Post - Dicas e Truques',
        content: {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Dicas úteis para desenvolvedores no terceiro post do seed.',
                    version: 1,
                  },
                ],
              },
            ],
          },
        },
      },
    ]

    console.log('📝 Criando posts de exemplo com Lexical...')

    for (const [index, postData] of samplePosts.entries()) {
      try {
        const post = await payload.create({
          collection: 'posts',
          data: postData as any,
        })

        console.log(`✅ Post ${index + 1} criado:`, postData.title)
      } catch (error) {
        console.error(`❌ Erro ao criar post ${index + 1}:`, error)
      }
    }

    console.log('🎉 Seed concluído! 3 posts criados com sucesso.')
  } else {
    console.log(`ℹ️  Já existem ${totalPosts} posts no banco de dados.`)
  }
}
