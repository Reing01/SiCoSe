import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiDocument } from '../openapi.js'

export const docsRouter = Router()

docsRouter.get('/openapi.json', (_request, response) => {
  response.json(openApiDocument)
})

docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
)
