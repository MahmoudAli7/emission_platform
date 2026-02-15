import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { DRIZZLE } from '../database/database.module';

describe('SitesService', () => {
  let service: SitesService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 'site-1',
          name: 'Test Site',
          location: 'Test Location',
          emissionLimit: '5000',
          totalEmissionsToDate: '0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  describe('create', () => {
    it('should create a site and return it', async () => {
      const dto = {
        name: 'New Site',
        location: 'New Location',
        emission_limit: 5000,
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Site');
      expect(result.status).toBe('Within Limit');
    });
  });

  describe('findAll', () => {
    it('should return all sites', async () => {
      mockDb.select = jest.fn().mockReturnThis();
      mockDb.from = jest.fn().mockResolvedValue([
        {
          id: 'site-1',
          name: 'Site 1',
          location: 'Location 1',
          emissionLimit: '5000',
          totalEmissionsToDate: '100',
        },
      ]);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Within Limit');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for a site', async () => {
      mockDb.select = jest.fn().mockReturnThis();
      mockDb.from = jest.fn().mockReturnThis();
      mockDb.where = jest.fn().mockReturnThis();

      // Mock the first query for site data
      mockDb.where.mockResolvedValueOnce([
        {
          id: 'site-1',
          name: 'Test Site',
          location: 'Location',
          emissionLimit: '5000',
          totalEmissionsToDate: '250',
        },
      ]);

      // Mock subsequent queries (for stats)
      mockDb.where.mockResolvedValueOnce([
        {
          count: 5,
          lastReading: '2026-02-10T12:00:00Z',
        },
      ]);

      const result = await service.getMetrics('site-1');

      expect(result).toBeDefined();
      expect(result.site_id).toBe('site-1');
      expect(result.readings_count).toBe(5);
      expect(result.status).toBe('Within Limit');
    });

    it('should throw NotFoundException if site does not exist', async () => {
      mockDb.select = jest.fn().mockReturnThis();
      mockDb.from = jest.fn().mockReturnThis();
      mockDb.where = jest.fn().mockResolvedValueOnce([]); // No site found

      await expect(service.getMetrics('non-existent')).rejects.toThrow();
    });
  });
});

