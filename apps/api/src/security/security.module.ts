import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RateLimitService } from "./rate-limit.service";
import { SecurityAuditService } from "./security-audit.service";

@Module({
  imports: [PrismaModule],
  providers: [RateLimitService, SecurityAuditService],
  exports: [RateLimitService, SecurityAuditService],
})
export class SecurityModule {}
