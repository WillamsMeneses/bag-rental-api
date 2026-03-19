import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    //TODO: Si queremos que funcione con cualquier puerto hay que agregar esto(/\.localhost\./): origin: ['http://localhost:5173', /\.localhost\./]
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ========== CONFIGURACIÓN DE SWAGGER ==========
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT-auth', // Este nombre debe coincidir con @ApiBearerAuth('JWT-auth') en tus controladores
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Configurar Swagger UI en la ruta /api
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Mantiene el token JWT al recargar la página
      tagsSorter: 'alpha', // Ordena los tags alfabéticamente
      operationsSorter: 'alpha', // Ordena las operaciones alfabéticamente
    },
    customSiteTitle: 'API Documentation',
  });
  // ========== FIN CONFIGURACIÓN SWAGGER ==========

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger UI available at: http://localhost:${port}/api`);
  console.log(
    `📄 OpenAPI JSON available at: http://localhost:${port}/api-json`,
  );
}
void bootstrap();
