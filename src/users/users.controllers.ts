import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
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
