import { IsIn, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export const CRM_STATUSES = [
  "new",
  "potential_customer",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "not_interested",
  "lost",
  "archived",
] as const;

export class UpdateCrmDto {
  @ApiProperty({
    enum: CRM_STATUSES,
    required: false,
  })
  @IsString() @IsOptional() @IsIn(CRM_STATUSES)
  crmStatus?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() crmNotes?: string;
}
