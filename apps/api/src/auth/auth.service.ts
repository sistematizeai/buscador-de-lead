import { createHash, randomBytes } from "crypto";
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimitService } from "../security/rate-limit.service";
import { SecurityAuditService } from "../security/security-audit.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const PASSWORD_RESET_MESSAGE =
  "Se existir uma conta vinculada a este e-mail, enviaremos as instruções para redefinição de senha.";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private rateLimit: RateLimitService,
    private audit: SecurityAuditService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("E-mail já cadastrado");

    const hashed = await bcrypt.hash(dto.password, 12);
    const slug = dto.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        accounts: {
          create: {
            accountId: email,
            providerId: "credential",
            password: hashed,
          },
        },
        memberships: {
          create: {
            role: "owner",
            workspace: {
              create: {
                name: dto.workspaceName,
                slug: uniqueSlug,
              },
            },
          },
        },
      },
      include: { memberships: { include: { workspace: true } } },
    });

    const workspace = user.memberships[0].workspace;
    const token = this.signToken(user.id, workspace.id, user.email, user.sessionVersion);

    await this.audit.record({
      event: "user_registered",
      outcome: "success",
      userId: user.id,
      workspaceId: workspace.id,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    };
  }

  async login(dto: LoginDto, meta: { ipAddress?: string; userAgent?: string } = {}) {
    const email = dto.email.trim().toLowerCase();
    this.rateLimit.assertAllowed(`login:ip:${meta.ipAddress || "unknown"}`, 20, 15 * 60 * 1000);
    this.rateLimit.assertAllowed(`login:email:${email}`, 8, 15 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        accounts: { where: { providerId: "credential" } },
        memberships: { include: { workspace: true }, take: 1 },
      },
    });

    if (!user || !user.accounts[0]?.password) {
      await this.audit.record({
        event: "login_failed",
        outcome: "denied",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { emailKnown: false },
      });
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }

    const valid = await bcrypt.compare(dto.password, user.accounts[0].password);
    if (!valid) {
      await this.audit.record({
        event: "login_failed",
        outcome: "denied",
        userId: user.id,
        workspaceId: user.memberships[0]?.workspaceId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { emailKnown: true },
      });
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }

    const workspace = user.memberships[0]?.workspace;
    if (!workspace) throw new UnauthorizedException("Conta sem workspace ativo");
    const token = this.signToken(user.id, workspace.id, user.email, user.sessionVersion);

    await this.audit.record({
      event: "login_success",
      outcome: "success",
      userId: user.id,
      workspaceId: workspace.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto, meta: { ipAddress?: string; userAgent?: string }) {
    const email = dto.email.trim().toLowerCase();
    this.rateLimit.assertAllowed(`password-reset:email:${email}`, 3, 60 * 60 * 1000);
    this.rateLimit.assertAllowed(`password-reset:ip:${meta.ipAddress || "unknown"}`, 10, 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, memberships: { select: { workspaceId: true }, take: 1 } },
    });

    if (!user) {
      await this.audit.record({
        event: "password_reset_requested",
        outcome: "success",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { emailKnown: false },
      });
      return { message: PASSWORD_RESET_MESSAGE };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    await this.audit.record({
      event: "password_reset_requested",
      outcome: "success",
      userId: user.id,
      workspaceId: user.memberships[0]?.workspaceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { emailKnown: true },
    });

    const resetUrl = `${this.config.get<string>("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    if (this.shouldExposeDevResetUrl()) {
      return { message: PASSWORD_RESET_MESSAGE, devResetUrl: resetUrl };
    }

    return { message: PASSWORD_RESET_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto, meta: { ipAddress?: string; userAgent?: string }) {
    this.assertStrongPassword(dto.password);
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { memberships: { take: 1 } } } },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      await this.audit.record({
        event: "password_reset_completed",
        outcome: "denied",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new BadRequestException("Token inválido, expirado ou já utilizado");
    }

    const credentialAccount = await this.prisma.account.findFirst({
      where: { userId: resetToken.userId, providerId: "credential" },
      select: { id: true, password: true },
    });

    if (credentialAccount?.password) {
      const reused = await bcrypt.compare(dto.password, credentialAccount.password);
      if (reused) throw new BadRequestException("A nova senha não pode ser igual à senha atual");
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      credentialAccount
        ? this.prisma.account.update({ where: { id: credentialAccount.id }, data: { password: hashed } })
        : this.prisma.account.create({
            data: {
              userId: resetToken.userId,
              accountId: resetToken.user.email,
              providerId: "credential",
              password: hashed,
            },
          }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { sessionVersion: { increment: 1 } },
      }),
      this.prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    await this.audit.record({
      event: "password_reset_completed",
      outcome: "success",
      userId: resetToken.userId,
      workspaceId: resetToken.user.memberships[0]?.workspaceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      message:
        "Senha redefinida com sucesso. Por segurança, todas as sessões anteriores foram encerradas. Faça login novamente.",
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { workspace: true }, take: 1 } },
    });
    if (!user) throw new UnauthorizedException();
    const workspace = user.memberships[0]?.workspace;
    return {
      user: { id: user.id, name: user.name, email: user.email },
      workspace: workspace
        ? { id: workspace.id, name: workspace.name, slug: workspace.slug }
        : null,
    };
  }

  private signToken(userId: string, workspaceId: string, email: string, sessionVersion: number) {
    return this.jwt.sign({ sub: userId, workspaceId, email, sessionVersion });
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private shouldExposeDevResetUrl() {
    return (
      this.config.get<string>("NODE_ENV") !== "production" &&
      this.config.get<string>("PASSWORD_RESET_DEV_RESPONSE") === "true"
    );
  }

  private assertStrongPassword(password: string) {
    const valid =
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!valid) {
      throw new BadRequestException(
        "A senha precisa ter ao menos 10 caracteres, letra maiúscula, letra minúscula, número e caractere especial",
      );
    }
  }
}
