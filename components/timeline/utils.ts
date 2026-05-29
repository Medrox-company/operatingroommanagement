import { TIMELINE_START_HOUR, TIMELINE_HOURS } from './constants';

// ========== HELPER FUNCTIONS ==========
export const getTimePercent = (date: Date): number => {
  const hours = date.getHours() + date.getMinutes() / 60;
  let percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
  if (percent < 0) percent += (24 / TIMELINE_HOURS) * 100;
  // Return percent clamped to valid timeline range
  return Math.max(0, Math.min(100, percent));
};

export const parseTimeToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const hourLabel = (hour: number): string => {
  // Convert timeline hour (0-24) to actual 24-hour format (7:00 to 7:00 next day)
  const actualHour = TIMELINE_START_HOUR + hour; // 7 + (0-24) = 7-31
  const displayHour = actualHour % 24; // Display as 7-23, 0-6
  return `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
};

// Compact label for smaller screens - just the hour number
export const hourLabelCompact = (hour: number): string => {
  const actualHour = TIMELINE_START_HOUR + hour;
  const displayHour = actualHour % 24;
  return `${displayHour}`;
};

export const isNextDayHour = (hour: number): boolean => hour >= 24;

// Check if operation should be displayed in current 24-hour window (7:00 today to 7:00 tomorrow)
// Rules:
// - SHOW operations that started OR ended within the current 24h window (7:00 - 7:00)
// - SHOW continuing operations that started before 7:00 but end after 7:00 (still running)
// - DO NOT show operations that fully ended before the window start (yesterday's old ops)
export const isOperationInWindow = (startDate: Date, endDate: Date, currentTime: Date): boolean => {
  // Get current window start: 7:00 of the current day
  const windowStart = new Date(currentTime);
  windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
  // If current time is before 7:00, window started yesterday
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    windowStart.setDate(windowStart.getDate() - 1);
  }
  // Window ends at 7:00 next day
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  // Show if operation overlaps with the 24h window at all
  // (operation ends after window start AND starts before window end)
  return endDate > windowStart && startDate < windowEnd;
};

// Check if operation exceeds 24 hours
export const exceedsT24Hours = (startDate: Date, endDate: Date): boolean => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  return durationHours > 24;
};

// Get time percent for timeline display
// Timeline runs from 7:00 (0%) to 7:00 next day (100%)
// Operations that cross 7:00 will extend beyond 100%
export const getTimePercentForTimeline = (date: Date, referenceStart: Date): number => {
  const diffMs = date.getTime() - referenceStart.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return (diffHours / TIMELINE_HOURS) * 100;
};

// Get operation position on timeline (single continuous bar, even if crossing 7:00)
export const getOperationPosition = (startDate: Date, endDate: Date, currentTime: Date): {
  left: number,
  width: number,
  exceedsBoundary: boolean,
  isContinuing: boolean  // True if operation started before 7:00 (from previous day)
} => {
  // Calculate window start (7:00 of the current day)
  const windowStart = new Date(currentTime);
  windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);

  // If current time is before 7:00, window started yesterday
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    windowStart.setDate(windowStart.getDate() - 1);
  }

  // Calculate position relative to window start
  let leftPct = getTimePercentForTimeline(startDate, windowStart);
  let endPct = getTimePercentForTimeline(endDate, windowStart);

  // Check if operation started before window (continuing from previous day)
  const isContinuing = leftPct < 0;

  // Clamp left to 0 if operation started before window
  if (leftPct < 0) leftPct = 0;

  // Check if operation exceeds timeline boundary (past 7:00 next day = 100%)
  const exceedsBoundary = endPct > 100;

  // Clamp end to 100 for display (but track if it exceeds)
  if (endPct > 100) endPct = 100;

  const width = Math.max(0, endPct - leftPct);

  return {
    left: leftPct,
    width: width,
    exceedsBoundary: exceedsBoundary,
    isContinuing: isContinuing
  };
};
