import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMetricCategoryDto } from './dto/create-metric-category.dto';
import { UpdateMetricCategoryDto } from './dto/update-metric-category.dto';

@Injectable()
export class MetricCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMetricCategoryDto) {
    const existingCategory = await this.prisma.metricCategory.findFirst({
      where: {
        OR: [{ slug: dto.slug }, { name: dto.name }],
      },
    });

    if (existingCategory) {
      throw new ConflictException('Metric category already exists');
    }

    return this.prisma.metricCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  findAll(includeInactive = true) {
    return this.prisma.metricCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        definitions: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  async update(id: string, dto: UpdateMetricCategoryDto) {
    await this.findByIdOrThrow(id);

    return this.prisma.metricCategory.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async findByIdOrThrow(id: string) {
    const category = await this.prisma.metricCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Metric category not found');
    }

    return category;
  }
}
