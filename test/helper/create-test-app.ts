// test/create-test-app.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';

export async function createTestingApp(): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  await module.init();
  return module;
}
