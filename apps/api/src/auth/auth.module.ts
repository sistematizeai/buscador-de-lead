import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { PermissionsGuard } from "./permissions.guard";
import { SecurityModule } from "../security/security.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    SecurityModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET environment variable must be set");
        return { secret, signOptions: { expiresIn: "30d" } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, PermissionsGuard],
  exports: [JwtModule, JwtGuard, PermissionsGuard],
})
export class AuthModule {}
