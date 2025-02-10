import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { corsConfig } from '@/config/cors.config';

/**
 * Bootstraps the NestJS application.
 * Configures CORS and starts the server.
 */
async function bootstrap(): Promise<void> {
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
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
