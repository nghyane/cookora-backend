import app from './app'
import { env } from './shared/config/env'

// Start server
// Bun.serve({
//   fetch: app.fetch,
//   port: env.PORT,
//   hostname: '0.0.0.0',
//   development: env.NODE_ENV === 'development',
// })


export default {
  fetch: app.fetch,
  port: env.PORT,
  hostname: '0.0.0.0',
  development: env.NODE_ENV === 'development',
}
