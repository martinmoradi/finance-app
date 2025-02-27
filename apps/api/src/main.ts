import { AppModule } from '@/app.module';
import { corsConfig } from '@/config/cors.config';
import { swaggerConfig } from '@/config/swagger.config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { getRequiredEnvVar } from '@repo/env-validation';
import cookieParser from 'cookie-parser';
/**
 * Bootstraps the NestJS application.
 * Configures CORS and starts the server.
 */
async function bootstrap(): Promise<void> {
  const COOKIE_SECRET = getRequiredEnvVar('COOKIE_SECRET');

  const app = await NestFactory.create(AppModule);
  // Configure CORS with error handling
  try {
    app.enableCors({
      origin: corsConfig.origins,
      methods: corsConfig.methods,
      credentials: corsConfig.credentials,
      allowedHeaders: corsConfig.allowedHeaders,
      maxAge: corsConfig.maxAge,
    });
  } catch (error) {
    console.error('Failed to configure CORS:', error);
    throw error;
  }
  app.use(cookieParser(COOKIE_SECRET));

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      security: [
        {
          'access-token': [],
          'refresh-token': [],
          'device-id': [],
        },
      ],
    },
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
