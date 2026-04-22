import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { DataSource } from 'typeorm';

describe('Docker Database Connection', () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  it('debe conectar a la base de datos de Docker', async () => {
    const isConnected = dataSource.isInitialized;
    const dbConfig = dataSource.options as unknown;

    console.log('Host:', (dbConfig as { host: string }).host);
    console.log('Puerto:', (dbConfig as { port: number }).port);
    console.log('Database:', (dbConfig as { database: string }).database);
    console.log('Conectado:', isConnected);
    expect(isConnected).toBe(true);
  });
});
