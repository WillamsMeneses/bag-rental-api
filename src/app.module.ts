// src/app.module.ts - ACTUALIZADO
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        // Verificar configuración
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        if (!dbConfig.url && !dbConfig.host) {
          console.error('❌ ERROR: No database host or URL configured');
          console.error('   Asegúrate que tu .env tenga DATABASE_URL');
          throw new Error('Database connection missing');
        }
        console.log('✅ Database config loaded');
        // Combinar configuración de database.config.ts con opciones de NestJS
        return {
          ...dbConfig,
          autoLoadEntities: true, // ← AQUÍ SÍ va autoLoadEntities
          // Mantener synchronize solo en desarrollo
          synchronize: process.env.NODE_ENV === 'development',
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
