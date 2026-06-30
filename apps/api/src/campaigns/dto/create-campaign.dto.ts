import { IsString, IsArray, IsOptional, IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { CampaignRegionConfig } from "../campaign-query-planner";

export class CreateCampaignDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() industry: string;
  @ApiProperty() @IsString() location: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) searchQueries: string[];
  @ApiProperty({ required: false }) @IsOptional() regionConfig?: CampaignRegionConfig;
  @ApiProperty({ required: false, default: "missing_website" }) @IsOptional() @IsString() targetWebsiteMode?: "any" | "missing_website";
  @ApiProperty() @IsString() yourService: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Max(100) maxResults?: number;
  @ApiProperty({ default: "balanced" }) @IsOptional() @IsString() contentStyle?: string;
  @ApiProperty({ default: "portuguese" }) @IsOptional() @IsString() language?: string;
  @ApiProperty({ required: false, default: "google_maps" }) @IsOptional() @IsString() source?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) sources?: string[];
}
