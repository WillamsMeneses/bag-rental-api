import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
    };
  }
}
