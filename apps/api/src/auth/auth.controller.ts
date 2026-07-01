import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtGuard } from "./jwt.guard";
import { CurrentUserId } from "./current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register new user + workspace" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Login with email + password" })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("password-reset/request")
  @ApiOperation({ summary: "Solicita link seguro de redefinição de senha" })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() req: Request) {
    return this.authService.requestPasswordReset(dto, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("password-reset/confirm")
  @ApiOperation({ summary: "Redefine a senha usando token temporário" })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user info" })
  @UseGuards(JwtGuard)
  async me(@CurrentUserId() userId: string) {
    return this.authService.me(userId);
  }
}
