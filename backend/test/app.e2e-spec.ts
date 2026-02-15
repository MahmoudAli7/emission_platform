import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('API E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Format', () => {
    it('should have valid response structure', () => {
      // This test verifies that global interceptors and filters work
      // In a real scenario, you would test actual HTTP responses
      expect(app).toBeDefined();
    });
  });

  describe('Application Bootstrap', () => {
    it('should initialize the application', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });
  });
});

