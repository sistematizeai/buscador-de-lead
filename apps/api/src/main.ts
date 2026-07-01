import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { buildCorsOptions } from "./config/cors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === "production",
  }));
  app.enableCors(buildCorsOptions());

  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
    const config = new DocumentBuilder()
      .setTitle("LeadSync API")
      .setDescription("AI-powered GTM automation platform API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`LeadSync API running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
