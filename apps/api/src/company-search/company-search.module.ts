import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LeadsModule } from "../leads/leads.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SecurityModule } from "../security/security.module";
import { CompanySearchController } from "./company-search.controller";
import { CompanySearchService } from "./company-search.service";

@Module({
  imports: [AuthModule, LeadsModule, PrismaModule, SecurityModule],
  controllers: [CompanySearchController],
  providers: [CompanySearchService],
})
export class CompanySearchModule {}
