// biome-ignore-all lint/style/useNamingConvention: Bun uses all-caps convention

import {serve} from 'bun'

import index from './index.html'

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    '/*': index,

    '/api/hello': {
      async GET(_req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'GET',
        })
      },
      async PUT(_req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'PUT',
        })
      },
    },

    '/api/hello/:name': async req => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`,
      })
    },
  },

  development: process.env.NODE_ENV !== 'production',
})

// biome-ignore lint/suspicious/noConsole: we need it here
console.log(`🚀 Server running at ${server.url}`)
