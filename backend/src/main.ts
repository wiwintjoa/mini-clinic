import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api'); app.use(helmet()); app.use(cookieParser());
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN').split(',').map((value) => value.trim()), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor()); app.useGlobalFilters(new GlobalExceptionFilter()); app.enableShutdownHooks();
  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0');
}
void bootstrap();
