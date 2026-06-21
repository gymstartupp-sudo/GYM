export const VALID_YEAR_MESSAGE = 'Please enter a valid date in DD-MM-YYYY format.';

export const DOB_MESSAGES = {
  MIN_AGE: 'You must be at least 14 years old to register.',
  MAX_AGE: 'Please enter a valid date of birth (maximum age 100 years).',
  FUTURE: 'Date of birth cannot be a future date.',
  INVALID: 'Please enter a valid date of birth.',
};

export const START_DATE_PAST_MESSAGE = 'Start date cannot be in the past.';
export const EXPENSE_YEAR_MESSAGE = 'Please select a date within the current financial year.';

export const DATE_RULES = {
  DOB: 'dob',
  MEMBERSHIP_START: 'membershipStart',
  EXPENSE: 'expense',
  REGISTRATION_START: 'registrationStart',
  DEFAULT: 'default',
};

export const getCurrentYear = () => new Date().getFullYear();

export const getDobYearBounds = () => {
  const currentYear = getCurrentYear();
  return { minYear: currentYear - 100, maxYear: currentYear - 14 };
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const toLocalDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};

export const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null;

  const match = value.trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day, date: startOfDay(date) };
};

export const parseDisplayDate = (value) => {
  if (!value || typeof value !== 'string') return null;

  const match = value.trim().slice(0, 10).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day, date: startOfDay(date) };
};

export const isoToSegments = (value) => {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return { day: '', month: '', year: '' };
  }

  return {
    day: String(parsed.day).padStart(2, '0'),
    month: String(parsed.month).padStart(2, '0'),
    year: String(parsed.year).slice(0, 4),
  };
};

export const segmentsToIso = ({ day, month, year }) => {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return '';
  }

  return `${year}-${month}-${day}`;
};

export const segmentsToDisplay = ({ day, month, year }) => {
  const dayPart = day.length === 0 ? 'dd' : day.length === 1 ? `${day}d` : day.slice(0, 2);
  const monthPart = month.length === 0 ? 'mm' : month.length === 1 ? `${month}m` : month.slice(0, 2);
  const yearPart = year.length === 0 ? 'yyyy' : `${year}${'y'.repeat(4 - year.length)}`;

  return `${dayPart}-${monthPart}-${yearPart}`;
};

export const formatIsoToDisplay = (value) => {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';

  const day = String(parsed.day).padStart(2, '0');
  const month = String(parsed.month).padStart(2, '0');
  const year = String(parsed.year).slice(0, 4);

  return `${day}-${month}-${year}`;
};

export const formatDisplayToIso = (value) => {
  const parsed = parseDisplayDate(value);
  if (!parsed) return '';

  const day = String(parsed.day).padStart(2, '0');
  const month = String(parsed.month).padStart(2, '0');
  const year = String(parsed.year).slice(0, 4);

  return `${year}-${month}-${day}`;
};

export const formatDateToYYYYMMDD = (value) => {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = String(value.getFullYear()).slice(0, 4);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    return `${parts[0].slice(0, 4)}-${parts[1]}-${parts[2]}`;
  }

  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    return formatDisplayToIso(str);
  }

  const parsed = toLocalDate(str);
  return parsed ? formatDateToYYYYMMDD(parsed) : '';
};

export const clampDateInputValue = (value) => {
  if (!value || typeof value !== 'string') return '';

  const parts = value.split('-');
  if (parts[0]?.length > 4) {
    parts[0] = parts[0].slice(0, 4);
  }

  return parts.join('-');
};

export const getSegmentFromCursor = (cursorPos) => {
  if (cursorPos <= 2) return 'day';
  if (cursorPos <= 5) return 'month';
  return 'year';
};

export const addDigitToSegments = (segments, digit, cursorPos = null) => {
  const next = { ...segments };

  if (cursorPos !== null) {
    const segment = getSegmentFromCursor(cursorPos);

    if (segment === 'year' && next.year.length < 4) {
      next.year = `${next.year}${digit}`.slice(0, 4);
      return next;
    }

    if (segment === 'month') {
      if (next.month.length < 2) {
        if (next.month.length === 0 && !/[0-1]/.test(digit)) {
          return next;
        }
        const candidate = `${next.month}${digit}`;
        if (Number(candidate) > 12) {
          next.month = '12';
        } else if (candidate.length === 2 && Number(candidate) === 0) {
          return next;
        } else {
          next.month = candidate;
        }
        return next;
      }
      if (next.year.length < 4) {
        next.year = `${next.year}${digit}`.slice(0, 4);
      }
      return next;
    }

    if (segment === 'day') {
      if (next.day.length < 2) {
        if (next.day.length === 0 && !/[0-3]/.test(digit)) {
          return next;
        }
        const candidate = `${next.day}${digit}`;
        if (Number(candidate) > 31) {
          next.day = '31';
        } else if (candidate.length === 2 && Number(candidate) === 0) {
          return next;
        } else {
          next.day = candidate;
        }
        return next;
      }
      if (next.month.length < 2) {
        if (next.month.length === 0 && !/[0-1]/.test(digit)) {
          return next;
        }
        const candidate = `${next.month}${digit}`;
        if (Number(candidate) > 12) {
          next.month = '12';
        } else if (candidate.length === 2 && Number(candidate) === 0) {
          return next;
        } else {
          next.month = candidate;
        }
        return next;
      }
      if (next.year.length < 4) {
        next.year = `${next.year}${digit}`.slice(0, 4);
      }
      return next;
    }
  }

  if (next.day.length < 2) {
    if (next.day.length === 0 && !/[0-3]/.test(digit)) {
      return next;
    }

    const candidate = `${next.day}${digit}`;
    if (Number(candidate) > 31) {
      next.day = '31';
    } else if (candidate.length === 2 && Number(candidate) === 0) {
      return next;
    } else {
      next.day = candidate;
    }
    return next;
  }

  if (next.month.length < 2) {
    if (next.month.length === 0 && !/[0-1]/.test(digit)) {
      return next;
    }

    const candidate = `${next.month}${digit}`;
    if (Number(candidate) > 12) {
      next.month = '12';
    } else if (candidate.length === 2 && Number(candidate) === 0) {
      return next;
    } else {
      next.month = candidate;
    }
    return next;
  }

  if (next.year.length < 4) {
    next.year = `${next.year}${digit}`.slice(0, 4);
  }

  return next;
};

export const removeDigitFromSegment = (segments, segment) => {
  const next = { ...segments };

  if (segment === 'day') {
    next.day = next.day.slice(0, -1);
  } else if (segment === 'month') {
    next.month = next.month.slice(0, -1);
  } else {
    next.year = next.year.slice(0, -1);
  }

  return next;
};

export const sanitizePastedDate = (text) => {
  const trimmed = String(text || '').trim();

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0').slice(0, 2);
    const month = dmyMatch[2].padStart(2, '0').slice(0, 2);
    const year = dmyMatch[3].slice(0, 4);
    return { day, month, year };
  }

  const ymdMatch = trimmed.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1].slice(0, 4);
    const month = ymdMatch[2].padStart(2, '0').slice(0, 2);
    const day = ymdMatch[3].padStart(2, '0').slice(0, 2);
    return { day, month, year };
  }

  const digits = trimmed.replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 8) {
    return {
      day: digits.slice(0, 2),
      month: digits.slice(2, 4),
      year: digits.slice(4, 8),
    };
  }

  return null;
};

export const isWithinBounds = (date, minDate, maxDate) => {
  const min = toLocalDate(minDate);
  const max = toLocalDate(maxDate);

  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
};

export const validateDob = (isoDate) => {
  if (!isoDate) return '';

  const parsed = parseIsoDate(isoDate);
  if (!parsed) return DOB_MESSAGES.INVALID;

  const { minYear, maxYear } = getDobYearBounds();

  if (parsed.year > maxYear) return DOB_MESSAGES.MIN_AGE;
  if (parsed.year < minYear) return DOB_MESSAGES.MAX_AGE;

  const today = startOfDay(new Date());
  if (parsed.date > today) return DOB_MESSAGES.FUTURE;

  return '';
};

export const validateMembershipStart = (isoDate, { minDate } = {}) => {
  if (!isoDate) return '';

  const parsed = parseIsoDate(isoDate);
  if (!parsed) return 'Enter a valid date.';

  const today = startOfDay(new Date());
  if (parsed.date < today) return START_DATE_PAST_MESSAGE;

  if (minDate) {
    const min = toLocalDate(minDate);
    if (min && parsed.date < min) {
      return START_DATE_PAST_MESSAGE;
    }
  }

  return '';
};

export const validateExpenseDate = (isoDate) => {
  if (!isoDate) return '';

  const parsed = parseIsoDate(isoDate);
  if (!parsed) return 'Enter a valid date.';

  if (parsed.year !== getCurrentYear()) {
    return EXPENSE_YEAR_MESSAGE;
  }

  return '';
};

export const validateRegistrationStart = (isoDate, { minDate, maxDate } = {}) => {
  if (!isoDate) return '';

  const parsed = parseIsoDate(isoDate);
  if (!parsed) return 'Enter a valid date.';

  if (!isWithinBounds(parsed.date, minDate, maxDate)) {
    if (minDate && parsed.date < toLocalDate(minDate)) {
      return `Start date cannot be before ${formatIsoToDisplay(formatDateToYYYYMMDD(minDate))}`;
    }
    if (maxDate && parsed.date > toLocalDate(maxDate)) {
      return 'Start date cannot be more than 90 days in the future';
    }
  }

  return '';
};

export const getDateYearValidationError = (value, { minYear, maxYear } = {}) => {
  if (!value || typeof value !== 'string') return '';

  const [yearStr, monthStr, dayStr] = value.split('-');
  if (!yearStr || yearStr.length !== 4) return '';

  const year = Number.parseInt(yearStr, 10);
  if (!Number.isFinite(year)) return VALID_YEAR_MESSAGE;

  const min = minYear ?? 1900;
  const max = maxYear ?? getCurrentYear() + 100;

  if (year < min || year > max) return VALID_YEAR_MESSAGE;

  if (!monthStr || !dayStr || monthStr.length !== 2 || dayStr.length !== 2) return '';

  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return VALID_YEAR_MESSAGE;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return VALID_YEAR_MESSAGE;
  }

  return '';
};

export const validateDateByRule = (isoDate, rule, options = {}) => {
  if (!isoDate) return '';

  const yearError = getDateYearValidationError(isoDate, options);
  if (yearError) return yearError;

  switch (rule) {
    case DATE_RULES.DOB:
      return validateDob(isoDate);
    case DATE_RULES.MEMBERSHIP_START:
      return validateMembershipStart(isoDate, options);
    case DATE_RULES.EXPENSE:
      return validateExpenseDate(isoDate);
    case DATE_RULES.REGISTRATION_START:
      return validateRegistrationStart(isoDate, options);
    default:
      return parseIsoDate(isoDate) ? '' : VALID_YEAR_MESSAGE;
  }
};

export const processDateInput = (rawValue, options = {}) => {
  const value = clampDateInputValue(rawValue);
  const { rule = DATE_RULES.DEFAULT, ...ruleOptions } = options;
  const error = value.length === 10 ? validateDateByRule(value, rule, ruleOptions) : '';
  return { value, error };
};

export const toDateInputString = (value) => formatDateToYYYYMMDD(value);
