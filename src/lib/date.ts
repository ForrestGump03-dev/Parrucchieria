import { format, parse } from 'date-fns';

const BUSINESS_DATE_FORMAT = 'yyyy-MM-dd';

export function formatBusinessDate(date: Date): string {
  return format(date, BUSINESS_DATE_FORMAT);
}

export function getTodayBusinessDate(): string {
  return formatBusinessDate(new Date());
}

export function parseBusinessDate(dateString: string): Date {
  return parse(dateString, BUSINESS_DATE_FORMAT, new Date());
}
