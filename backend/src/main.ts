import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((u) => u.trim()),
  });

  // Global exception filter — catches all errors
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor — wraps all successful responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
