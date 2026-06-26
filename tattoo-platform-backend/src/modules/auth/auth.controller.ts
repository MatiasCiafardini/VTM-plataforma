import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user and return a JWT' })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a student using the configured access code',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Request a password reset code by email' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/verify')
  @ApiOperation({ summary: 'Verify a password reset code' })
  verifyPasswordResetCode(@Body() dto: VerifyPasswordResetCodeDto) {
    return this.authService.verifyPasswordResetCode(dto);
  }

  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Reset password and return an authenticated JWT' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.sub);
  }
}
