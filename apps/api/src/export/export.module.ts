import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { AuthModule } from "../auth/auth.module";
import { SecurityModule } from "../security/security.module";

@Module({
  imports: [AuthModule, SecurityModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
