import {
  recurrenceDates,
  recurrenceWeekday,
} from '../src/features/ride/domain/recurrence';

test('previews selected weekdays at the same Mexico City time across weeks and month changes', () => {
  const first = new Date('2026-10-26T16:15:00Z');
  expect(recurrenceWeekday(first)).toBe(1);
  expect(recurrenceDates(first, [1, 3, 1], 2)).toEqual([
    '2026-10-26T16:15:00.000Z',
    '2026-10-28T16:15:00.000Z',
    '2026-11-02T16:15:00.000Z',
    '2026-11-04T16:15:00.000Z',
  ]);
});
test('does not add the starting date unless its weekday was selected', () => {
  expect(recurrenceDates(new Date('2026-10-26T16:00:00Z'), [3], 1)).toEqual([
    '2026-10-28T16:00:00.000Z',
  ]);
});
test('bounds recurrence to four weeks and rejects empty or invalid selections', () => {
  const date = new Date('2026-10-26T16:00:00Z');
  expect(recurrenceDates(date, [0, 1, 2, 3, 4, 5, 6], 4)).toHaveLength(28);
  expect(() => recurrenceDates(date, [], 1)).toThrow();
  expect(() => recurrenceDates(date, [1], 5)).toThrow();
  expect(() => recurrenceDates(new Date('invalid'), [1], 2)).toThrow();
});
