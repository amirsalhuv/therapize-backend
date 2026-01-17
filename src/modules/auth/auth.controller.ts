import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, RegisterPatientDto, RequestMagicLinkDto, AcceptFamilyInviteDto } from './dto';
import { Public, CurrentUser } from '../../common/decorators';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register/patient')
  @ApiOperation({ summary: 'Register a new patient with profile data' })
  @ApiResponse({ status: 201, description: 'Patient registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Invalid invitation token' })
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress =
      req.headers['x-forwarded-for']?.toString() || req.ip || req.socket?.remoteAddress;
    return this.authService.login(dto, deviceInfo, ipAddress);
  }

  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request & { user: { id: string; refreshTokenId: string } }) {
    return this.authService.refreshTokens(req.user.id, req.user.refreshTokenId);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request & { user: { id: string; refreshTokenId?: string } }) {
    return this.authService.logout(req.user.id, req.user.refreshTokenId);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@CurrentUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  // ============================================
  // MAGIC LINK AUTHENTICATION
  // ============================================

  @Public()
  @Post('magic-link/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link for passwordless login (family members only)' })
  @ApiResponse({ status: 200, description: 'Magic link sent if account exists' })
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto);
  }

  @Public()
  @Get('magic-link/verify/:token')
  @ApiOperation({ summary: 'Verify magic link and get tokens' })
  @ApiResponse({ status: 200, description: 'Magic link verified, tokens returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired magic link' })
  async verifyMagicLink(@Param('token') token: string, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress =
      req.headers['x-forwarded-for']?.toString() || req.ip || req.socket?.remoteAddress;
    return this.authService.verifyMagicLink(token, deviceInfo, ipAddress);
  }

  // ============================================
  // FAMILY MEMBER INVITATION
  // ============================================

  @Public()
  @Post('family-invite/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept family member invitation and create account' })
  @ApiResponse({ status: 200, description: 'Account created, auto-logged in' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  async acceptFamilyInvite(@Body() dto: AcceptFamilyInviteDto, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress =
      req.headers['x-forwarded-for']?.toString() || req.ip || req.socket?.remoteAddress;
    return this.authService.acceptFamilyInvite(dto, deviceInfo, ipAddress);
  }
}
