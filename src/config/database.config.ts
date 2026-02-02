// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export default registerAs('database', (): DataSourceOptions => {
  // OPCIÓN 1: Usar DATABASE_URL de Neon
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl, // ← URL COMPLETA de Neon
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      // NO autoLoadEntities aquí - eso va en TypeOrmModule
      extra: {
        max: 20,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      },
    };
  }

  // OPCIÓN 2: Variables individuales (fallback)
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    ssl: true,
    extra: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  };
});
