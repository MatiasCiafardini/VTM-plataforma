import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class FeedbackContentDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Transform(trimText)
  @IsString()
  @MinLength(1, { message: 'Contanos tu experiencia con la mentoría.' })
  @MaxLength(5000)
  feedback!: string;

  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  achievement!: string;
}

export class CreateFeedbackDto extends FeedbackContentDto {
  @IsUUID('4')
  submissionId!: string;
}

export class UpdateFeedbackDto extends FeedbackContentDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class ListFeedbacksDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  studentId?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(150)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @IsOptional()
  @IsIn(['true', 'false'])
  originals?: string;
}
