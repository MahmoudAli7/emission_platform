import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateSiteDto } from './create-site.dto';

@Injectable()
export class SitesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(dto: CreateSiteDto) {
    const [site] = await this.db
      .insert(schema.sites)
      .values({
        name: dto.name,
        location: dto.location,
        emissionLimit: dto.emission_limit.toString(),
      })
      .returning();

    return {
      id: site.id,
      name: site.name,
      location: site.location,
      emission_limit: site.emissionLimit,
      total_emissions_to_date: site.totalEmissionsToDate,
      status: this.getComplianceStatus(
        parseFloat(site.totalEmissionsToDate),
        parseFloat(site.emissionLimit),
      ),
      created_at: site.createdAt,
    };
  }

  async findAll() {
    const sites = await this.db.select().from(schema.sites);

    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      location: site.location,
      emission_limit: site.emissionLimit,
      total_emissions_to_date: site.totalEmissionsToDate,
      status: this.getComplianceStatus(
        parseFloat(site.totalEmissionsToDate),
        parseFloat(site.emissionLimit),
      ),
    }));
  }

  async getMetrics(siteId: string) {
    const [site] = await this.db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.id, siteId));

    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    // Get measurement count and last reading timestamp
    const [stats] = await this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        lastReading: sql<string>`max(${schema.measurements.recordedAt})`,
      })
      .from(schema.measurements)
      .where(eq(schema.measurements.siteId, siteId));

    const totalEmissions = parseFloat(site.totalEmissionsToDate);
    const limit = parseFloat(site.emissionLimit);

    return {
      site_id: site.id,
      name: site.name,
      location: site.location,
      emission_limit: site.emissionLimit,
      total_emissions_to_date: site.totalEmissionsToDate,
      status: this.getComplianceStatus(totalEmissions, limit),
      readings_count: stats?.count ?? 0,
      last_reading_at: stats?.lastReading ?? null,
    };
  }

  private getComplianceStatus(
    totalEmissions: number,
    emissionLimit: number,
  ): 'Within Limit' | 'Limit Exceeded' {
    return totalEmissions <= emissionLimit ? 'Within Limit' : 'Limit Exceeded';
  }
}
