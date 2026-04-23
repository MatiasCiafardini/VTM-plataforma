import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRegistrationCodeDto } from './dto/create-registration-code.dto';
import { UpdateRegistrationCodeDto } from './dto/update-registration-code.dto';
import { RegistrationCodesService } from './registration-codes.service';

@ApiTags('registration-codes')
@Controller('registration-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RegistrationCodesController {
  constructor(private readonly service: RegistrationCodesService) {}

  @Get()
  @ApiOperation({ summary: 'List all registration codes' })
  listCodes() {
    return this.service.listCodes();
  }

  @Post()
  @ApiOperation({ summary: 'Create a registration code' })
  createCode(@Body() dto: CreateRegistrationCodeDto) {
    return this.service.createCode(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a registration code' })
  updateCode(@Param('id') id: string, @Body() dto: UpdateRegistrationCodeDto) {
    return this.service.updateCode(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a registration code' })
  deleteCode(@Param('id') id: string) {
    return this.service.deleteCode(id);
  }
}
