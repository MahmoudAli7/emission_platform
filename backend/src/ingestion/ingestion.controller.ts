import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { ingestReadingsSchema } from './ingest-readings.dto';

@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  async ingest(@Body() body: unknown) {
    const parsed = ingestReadingsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        error: parsed.error.flatten(),
      });
    }

    return this.ingestionService.ingest(parsed.data);
  }
}
