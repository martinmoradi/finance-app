import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Personal Finance API')
  .setDescription('API for personal finance management')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter access token',
      in: 'header',
    },
    'access-token',
  )
  // Device ID Cookie
  .addCookieAuth(
    'deviceId',
    {
      type: 'apiKey',
      in: 'cookie',
      name: 'deviceId',
      description: 'Device identification cookie',
    },
    'device-id',
  )
  // Refresh Token Cookie
  .addCookieAuth(
    'refresh_token',
    {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
    },
    'refresh-token',
  )
  // CSRF Token
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'x-csrf-token',
    },
    'csrf-token',
  )
  .build();
