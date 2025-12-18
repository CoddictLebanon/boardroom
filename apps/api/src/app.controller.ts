import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Boardroom API is running',
      timestamp: new Date().toISOString(),
    };
  }
}
