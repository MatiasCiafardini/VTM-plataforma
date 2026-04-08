import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MetricCategoriesService } from '../metric-categories/metric-categories.service';
import { CreateMetricDefinitionDto } from './dto/create-metric-definition.dto';
import { UpdateMetricDefinitionDto } from './dto/update-metric-definition.dto';

@Injectable()
export class MetricDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricCategoriesService: MetricCategoriesService,
  ) {}

  async create(dto: CreateMetricDefinitionDto) {
    await this.metricCategoriesService.findByIdOrThrow(dto.categoryId);

    const existingDefinition = await this.prisma.metricDefinition.findFirst({
      where: {
        OR: [{ slug: dto.slug }, { name: dto.name }],
      },
    });

    if (existingDefinition) {
      throw new ConflictException('Metric definition already exists');
    }

    return this.prisma.metricDefinition.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        valueType: dto.valueType,
        isRequired: dto.isRequired ?? false,
        isActive: dto.isActive ?? true,
        isMonetary: dto.isMonetary ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  findAll(includeInactive = true) {
    return this.prisma.metricDefinition.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        category: true,
      },
    });
  }

  async update(id: string, dto: UpdateMetricDefinitionDto) {
    await this.findByIdOrThrow(id);

    if (dto.categoryId) {
      await this.metricCategoriesService.findByIdOrThrow(dto.categoryId);
    }

    return this.prisma.metricDefinition.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        valueType: dto.valueType,
        isRequired: dto.isRequired,
        isActive: dto.isActive,
        isMonetary: dto.isMonetary,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async findByIdOrThrow(id: string) {
    const definition = await this.prisma.metricDefinition.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!definition) {
      throw new NotFoundException('Metric definition not found');
    }

    return definition;
  }
}
