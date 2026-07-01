import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CompanySearchDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) companyName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) legalName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) tradeName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(24) cnpj?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2) state?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(12) zipCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) district?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) street?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) segment?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) cnae?: string;
}
