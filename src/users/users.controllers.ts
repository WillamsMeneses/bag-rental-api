// import { Controller, Get } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import {
//   CurrentUser,
//   CurrentUserData,
// } from '../common/decorators/current-user.decorator';

// @ApiTags('Users')
// @ApiBearerAuth('JWT-auth')
// @Controller('users')
// export class UsersController {
//   @Get('me')
//   @ApiOperation({ summary: 'Get current user profile' })
//   getCurrentUser(@CurrentUser() user: CurrentUserData) {
//     return {
//       id: user.id,
//       email: user.email,
//       authProvider: user.authProvider,
//     };
//   }
// }

import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
    };
  }

  @Post('stripe/onboarding')
  @ApiOperation({ summary: 'Get Stripe Connect onboarding link' })
  async getStripeOnboardingLink(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getStripeOnboardingLink(user.id);
  }

  @Get('stripe/status')
  @ApiOperation({ summary: 'Get Stripe Connect status' })
  async getStripeStatus(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getStripeStatus(user.id);
  }
}
