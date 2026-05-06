import { DashboardService } from './dashboard.service';

describe('DashboardService group meetings', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function makeService() {
    return new DashboardService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ) as DashboardService & {
      materializeUpcomingGroupMeetings: <Meeting extends {
        isRecurring: boolean;
        weekDay: number | null;
        startsAt: Date;
        endsAt: Date | null;
        timezone: string;
      }>(
        meetings: Meeting[],
      ) => Meeting[];
    };
  }

  it('materializes weekly meetings in the meeting timezone before student display conversion', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const service = makeService();

    const [meeting] = service.materializeUpcomingGroupMeetings([
      {
        id: 'meeting-1',
        title: 'Sesion semanal',
        description: null,
        timezone: 'America/Buenos_Aires',
        isRecurring: true,
        weekDay: 3,
        startsAt: new Date('2026-04-29T16:30:00.000Z'),
        endsAt: new Date('2026-04-29T17:30:00.000Z'),
        linkUrl: null,
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        updatedAt: new Date('2026-04-20T00:00:00.000Z'),
      },
    ]);

    const argentinaTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(meeting.startsAt);
    const mexicoTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(meeting.startsAt);

    expect(meeting.startsAt.toISOString()).toBe('2026-05-06T16:30:00.000Z');
    expect(argentinaTime).toBe('13:30');
    expect(mexicoTime).toBe('10:30');
  });
});
