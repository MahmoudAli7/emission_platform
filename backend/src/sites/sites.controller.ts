import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { createSiteSchema } from './create-site.dto';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createSiteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        error: parsed.error.flatten(),
      });
    }

    return this.sitesService.create(parsed.data);
  }

  @Get()
  async findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id/metrics')
  async getMetrics(@Param('id') id: string) {
    return this.sitesService.getMetrics(id);
  }

  @Get(':id/readings')
  async getReadings(@Param('id') id: string) {
    return this.sitesService.getReadings(id);
  }
}
