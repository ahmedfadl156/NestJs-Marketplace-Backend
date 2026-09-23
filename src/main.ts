import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from "cookie-parser"

const logger = new Logger('Bootstarp');
async function bootstrap() {
  const app = await NestFactory.create(AppModule , {
    instrument: ObserveInstrument,
  })
  app.use(cookieParser())

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
  // هنا احنا بنحط Perfix Global بحيث كل الراواتس تبدأ بيه علشان يبقى عندنا طريقة واحدة لكل الرواتس فى البرنامج
  app.setGlobalPrefix('/api')
  // هنا بنعمل بنشغلا ال Versions على كل الراوتس عن طريق ال URI بحيث نقدر نعمل اكتر من Version بعد كدا
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })
  // دى هنا ال ValidationPipe علشان تعمل فلتر للب Fields اللى هتدخهل وتعمل Transform لل Inputs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }))
  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
await bootstrap();
