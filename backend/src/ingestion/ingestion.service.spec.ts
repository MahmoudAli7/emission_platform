import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { DRIZZLE } from '../database/database.module';

describe('IngestionService', () => {
  let service: IngestionService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  describe('ingest', () => {
    it('should process a new batch successfully', async () => {
      const dto = {
        site_id: 'site-1',
        batch_key: 'batch-1',
        readings: [{ value: 100, recorded_at: '2026-02-10T12:00:00Z' }],
      };

      mockDb.where.mockResolvedValueOnce([]); // No existing batch
      mockDb.transaction.mockResolvedValue({
        batch_key: 'batch-1',
        readings_processed: 1,
        total_value: 100,
        duplicate: false,
      });

      const result = await service.ingest(dto);

      expect(result.batch_key).toBe('batch-1');
      expect(result.duplicate).toBe(false);
    });

    it('should detect duplicate batch and return cached result', async () => {
      const dto = {
        site_id: 'site-1',
        batch_key: 'batch-1',
        readings: [{ value: 100, recorded_at: '2026-02-10T12:00:00Z' }],
      };

      const existingBatch = {
        batchKey: 'batch-1',
        readingsCount: 1,
        totalValue: '100',
      };

      mockDb.where.mockResolvedValueOnce([existingBatch]);

      const result = await service.ingest(dto);

      expect(result.duplicate).toBe(true);
      expect(result.batch_key).toBe('batch-1');
    });
  });
});
