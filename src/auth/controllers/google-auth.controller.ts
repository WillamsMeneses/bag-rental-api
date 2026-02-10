import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';
import { GoogleAuthService } from '../services/google-auth.service';

interface GoogleUserRequest {
  user: {
    providerId: string;
    email: string;
    name: string;
    accessToken: string;
  };
}

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Inicia el flujo de OAuth
  }

  @Public()
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: GoogleUserRequest,
    @Res() res: Response,
  ) {
    try {
      const result = await this.googleAuthService.validateGoogleUser(req.user);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      const callbackUrl = `${frontendUrl}/auth/callback?token=${result.accessToken}`;
      return res.redirect(HttpStatus.FOUND, callbackUrl);
    } catch (error) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      const encodedError = encodeURIComponent(errorMessage);
      const errorUrl = `${frontendUrl}/auth/callback?error=${encodedError}`;
      return res.redirect(HttpStatus.FOUND, errorUrl);
    }
  }
}
