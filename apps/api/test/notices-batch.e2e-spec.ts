import { upcomingChangedAppointmentIds } from '../src/operations/notices.service';

describe('M4-07 reminder and reschedule batch selection', () => {
  const now = new Date('2026-11-08T00:00:00Z');
  const soon = new Date('2026-11-22T00:00:00Z');

  it('preserves changed-visit notifications for old or new appointment time in 14-day window', () => {
    const rows = [
      { id: 'moved_out', startsAt: new Date('2026-12-01T12:00:00Z') },
      { id: 'moved_in', startsAt: new Date('2026-11-12T12:00:00Z') },
      { id: 'outside', startsAt: new Date('2026-12-02T12:00:00Z') },
    ];
    const items = [
      { id: 'moved_out', before: new Date('2026-11-09T12:00:00Z') },
      { id: 'moved_in', before: new Date('2026-12-03T12:00:00Z') },
      { id: 'outside', before: new Date('2026-10-01T12:00:00Z') },
    ];
    expect(upcomingChangedAppointmentIds(rows, items, now, soon))
      .toEqual(['moved_out', 'moved_in']);
  });

  it('handles large synthetic batches without per-row searching and preserves first duplicate input', () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      id: 'appt-' + index,
      startsAt: new Date('2026-12-20T00:00:00Z'),
    }));
    const items = rows.map(row => ({
      id: row.id, before: new Date('2026-12-15T00:00:00Z'),
    }));
    items[4200].before = new Date('2026-11-11T00:00:00Z');
    items.push({ id: 'appt-4200', before: new Date('2026-12-18T00:00:00Z') });
    expect(upcomingChangedAppointmentIds(rows, items, now, soon))
      .toEqual(['appt-4200']);
  });

  it('excludes bounds and past-only changes and returns no duplicates for a single appointment', () => {
    const rows = [{ id: 'a', startsAt: soon }, { id: 'b', startsAt: now }];
    const items = [{ id: 'a', before: now }, { id: 'a', before: new Date('2026-11-09T12:00:00Z') }];
    expect(upcomingChangedAppointmentIds(rows, items, now, soon)).toEqual([]);
  });
});
