import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupMeetingDto } from './dto/create-group-meeting.dto';
import { UpdateGroupMeetingDto } from './dto/update-group-meeting.dto';

@Injectable()
export class GroupMeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMeetings() {
    return this.prisma.groupMeeting.findMany({
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMeeting(dto: CreateGroupMeetingDto) {
    const isRecurring = dto.isRecurring ?? false;
    const scheduledDate = isRecurring
      ? this.nextWeekdayDate(dto.weekDay!, dto.timezone)
      : dto.scheduledDate!;

    return this.prisma.groupMeeting.create({
      data: {
        title: dto.title,
        description: dto.description?.trim() || undefined,
        timezone: dto.timezone,
        isRecurring,
        weekDay: isRecurring ? dto.weekDay : null,
        startsAt: this.zonedTimeToUtc(
          scheduledDate,
          dto.startTime,
          dto.timezone,
        ),
        endsAt: dto.endTime
          ? this.zonedTimeToUtc(scheduledDate, dto.endTime, dto.timezone)
          : undefined,
        linkUrl: dto.linkUrl?.trim() || undefined,
      },
    });
  }

  async updateMeeting(meetingId: string, dto: UpdateGroupMeetingDto) {
    const meeting = await this.findByIdOrThrow(meetingId);

    const timezone = dto.timezone ?? meeting.timezone;
    const isRecurring =
      dto.isRecurring !== undefined ? dto.isRecurring : meeting.isRecurring;
    const weekDay = isRecurring
      ? dto.weekDay !== undefined
        ? dto.weekDay
        : (meeting.weekDay ?? 1)
      : null;

    let scheduledDate: string;
    if (isRecurring) {
      scheduledDate = this.nextWeekdayDate(weekDay, timezone);
    } else if (dto.scheduledDate) {
      scheduledDate = dto.scheduledDate;
    } else {
      scheduledDate = this.formatDateInTimezone(meeting.startsAt, timezone);
    }

    const startTime =
      dto.startTime ?? this.formatTimeInTimezone(meeting.startsAt, timezone);
    const nextEndTime =
      dto.endTime !== undefined
        ? dto.endTime
        : meeting.endsAt
          ? this.formatTimeInTimezone(meeting.endsAt, timezone)
          : undefined;

    return this.prisma.groupMeeting.update({
      where: { id: meetingId },
      data: {
        title: dto.title,
        description:
          dto.description === undefined
            ? undefined
            : dto.description.trim() || null,
        timezone,
        isRecurring,
        weekDay,
        startsAt: this.zonedTimeToUtc(scheduledDate, startTime, timezone),
        endsAt: nextEndTime
          ? this.zonedTimeToUtc(scheduledDate, nextEndTime, timezone)
          : null,
        linkUrl:
          dto.linkUrl === undefined ? undefined : dto.linkUrl.trim() || null,
      },
    });
  }

  async deleteMeeting(meetingId: string) {
    await this.findByIdOrThrow(meetingId);
    await this.prisma.groupMeeting.delete({
      where: { id: meetingId },
    });

    return { success: true };
  }

  private async findByIdOrThrow(meetingId: string) {
    const meeting = await this.prisma.groupMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Group meeting not found');
    }

    return meeting;
  }

  private nextWeekdayDate(weekDay: number, timezone: string): string {
    const now = new Date();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shortFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      if (weekdays.indexOf(shortFormatter.format(candidate)) === weekDay) {
        return dateFormatter.format(candidate);
      }
    }

    return dateFormatter.format(now);
  }

  private zonedTimeToUtc(
    dateValue: string,
    timeValue: string,
    timezone: string,
  ) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hour, minute] = timeValue.split(':').map(Number);
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const offset = this.getTimeZoneOffset(utcGuess, timezone);
    const resolved = new Date(utcGuess.getTime() - offset);
    const secondOffset = this.getTimeZoneOffset(resolved, timezone);

    return secondOffset === offset
      ? resolved
      : new Date(utcGuess.getTime() - secondOffset);
  }

  private getTimeZoneOffset(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<
      'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
      number
    >;

    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    return asUtc - date.getTime();
  }

  private formatDateInTimezone(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private formatTimeInTimezone(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    return formatter.format(date);
  }
}
