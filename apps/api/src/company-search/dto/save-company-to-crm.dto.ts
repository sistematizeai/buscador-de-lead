import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SaveCompanyToCrmDto {
  @ApiProperty() @IsString() @MaxLength(180) companyName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(180) tradeName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(14) cnpj?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) businessStatus?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(32) cnae?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(220) address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(12) zipCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(180) website?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1200) notes?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(60) searchProvider?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) sourceReference?: string;
}
