import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo de TypeORM para integration tests.
 * Lee las variables de .env.test y sincroniza el schema automáticamente.
 */
export const TestDatabaseModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5433),
    username: config.get('DB_USERNAME', 'test_user'),
    password: config.get('DB_PASSWORD', 'test_password'),
    database: config.get('DB_NAME', 'bag_rental_test'),
    // Importá todas las entidades que uses en los tests
    autoLoadEntities: true,
    synchronize: true,
    dropSchema: false,
    logging: false,
  }),
});
