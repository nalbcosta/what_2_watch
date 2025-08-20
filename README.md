# What 2 Watch

Aplicação simples que busca filmes usando TheMovieDB (TMDB). Para proteger a chave de API, o projeto usa um endpoint serverless (`/api/tmdb`) que lê a chave de uma variável de ambiente (`TMDB_API_KEY`).

## Requisitos
- Node.js 18+ (para rodar funções serverless localmente, opcional)
- Conta no Vercel (ou outro host que suporte serverless)

## Configurar no Vercel (recomendado)
1. Vá em Settings > Environment Variables do seu projeto no Vercel.
2. Adicione a variável `TMDB_API_KEY` com o valor da sua chave da TheMovieDB.
3. Faça deploy — o arquivo `api/tmdb.js` usará essa variável para encaminhar as requisições sem expor a chave no cliente.

## Testar localmente
- O endpoint em `/api/tmdb` foi criado como função serverless. Para testar localmente você pode:
  - Usar o Vercel CLI (recomendado):

    ```bash
    npm i -g vercel
    vercel dev
    ```

    O `vercel dev` inicia as rotas serverless localmente e você pode definir `TMDB_API_KEY` no seu ambiente (ex.: `export TMDB_API_KEY=xxxx` no Linux/macOS).

  - Ou testar as chamadas diretamente com sua chave (temporário): altere as funções no cliente para apontar para `https://api.themoviedb.org/3/...&api_key=SUA_CHAVE` — NÃO RECOMENDADO para produção.

## Remoção de chaves no cliente
- Se você tiver um arquivo `config.js` com a chave API no repositório, remova-o do repositório e adicione ao `.gitignore`.
- Não comite chaves em código público.

## Próximos passos recomendados
- Implementar rate-limiting / caching no endpoint proxy.
- Adicionar autenticação para recursos sensíveis.
- Melhorar testes e cobertura.

