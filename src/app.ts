import { Scalar } from '@scalar/hono-api-reference'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Import domain modules
import { authRoutes } from '@/modules/auth/routes'
import { ingredientsRoutes } from '@/modules/ingredients/routes'
import { recipesRoutes } from '@/modules/recipes/routes'
import { usersRoutes } from '@/modules/users/routes'
import { pantryRoutes } from '@/modules/pantry/routes'

// Import shared middleware and error handling
import { AppError } from '@/shared/utils/errors'
import { response } from '@/shared/utils/response'
import { HTTPException } from 'hono/http-exception'

const app = new OpenAPIHono()

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: '*',
    credentials: true,
  }),
)

// Mount domain routes
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/pantry', pantryRoutes)
app.route('/api/v1/ingredients', ingredientsRoutes)
app.route('/api/v1/recipes', recipesRoutes)
app.route('/api/v1/users', usersRoutes)

// Error handling with onError
app.onError((err, c) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    console.error('AppError caught:', {
      name: err.name,
      message: err.message,
      status: err.status,
      code: err.code,
      path: c.req.path,
      method: c.req.method,
    })

    const isDevelopment = process.env.NODE_ENV === 'development'
    const errorDetails = isDevelopment
      ? {
        stack: err.stack,
        path: c.req.path,
        method: c.req.method,
      }
      : err.details

    return c.json(
      response.error(err.message, err.code, errorDetails),
      err.status,
    )
  }

  // Handle HTTPException
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  // Handle unknown errors
  console.error('Unknown error caught:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  })

  const isDevelopment = process.env.NODE_ENV === 'development'
  const errorDetails = isDevelopment
    ? {
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    }
    : undefined

  return c.json(
    response.error(
      err.message || 'Something went wrong',
      'INTERNAL_SERVER_ERROR',
      errorDetails,
    ),
    500,
  )
})

// OpenAPI documentation
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Cookora API',
    version: '1.0.0',
    description: 'Vietnamese Culinary API with AI-powered ingredient detection',
  },
})

// Scalar API documentation UI
app.get(
  '/docs',
  Scalar({
    theme: 'deepSpace',
    url: '/openapi.json',
    persistAuth: true,
    authentication: {
      securitySchemes: {
        Bearer: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token authentication',
        },
      },
    },
  }),
)

// Root endpoint - API info
app.get('/', (c) => {
  return c.json(response.success({
    name: 'Cookora API',
    version: '1.0.0',
    description: 'Vietnamese Culinary API with AI-powered ingredient detection'
  }, 'Welcome to Cookora API'))
})

// Health check
app.get('/health', (c) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
  return c.json(response.success(healthData, 'Service is healthy'))
})

// 404 handler
app.notFound((c) => {
  return c.json(response.error('Route not found', 'NOT_FOUND'), 404 as ContentfulStatusCode)
})

export default app
