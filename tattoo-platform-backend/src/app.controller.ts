import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Backend health check' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'tattoo-platform-backend',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
