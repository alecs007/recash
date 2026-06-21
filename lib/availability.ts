export interface DaySchedule {
  day: number; // 0=Sunday, 1=Mon ... 6=Sat
  start: string; // "HH:MM"
  end: string;
}

export const DAYS_RO = [
  { value: 1, short: "L", long: "Luni" },
  { value: 2, short: "Ma", long: "Marți" },
  { value: 3, short: "Mi", long: "Miercuri" },
  { value: 4, short: "J", long: "Joi" },
  { value: 5, short: "V", long: "Vineri" },
  { value: 6, short: "S", long: "Sâmbătă" },
  { value: 0, short: "D", long: "Duminică" },
];

const SCHEDULE_TIMEZONE = "Europe/Bucharest";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getScheduleClock(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHEDULE_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let day = 0;
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === "weekday") day = WEEKDAY_MAP[part.value] ?? 0;
    if (part.type === "hour") hour = parseInt(part.value, 10) % 24;
    if (part.type === "minute") minute = parseInt(part.value, 10);
  }

  return { day, minutes: hour * 60 + minute };
}

export function isCurrentlyAvailable(
  schedule: DaySchedule[] | null | undefined,
): boolean {
  if (!schedule || schedule.length === 0) return true;
  const { day: currentDay, minutes: currentMins } = getScheduleClock(
    new Date(),
  );
  const todaySchedule = schedule.find((s) => s.day === currentDay);
  if (!todaySchedule) return false;
  const [sh, sm] = todaySchedule.start.split(":").map(Number);
  const [eh, em] = todaySchedule.end.split(":").map(Number);
  return currentMins >= sh * 60 + sm && currentMins <= eh * 60 + em;
}

export function getNextAvailableText(
  schedule: DaySchedule[] | null | undefined,
): string | null {
  if (!schedule || schedule.length === 0) return null;
  const { day: currentDay, minutes: currentMins } = getScheduleClock(
    new Date(),
  );
  for (let offset = 0; offset < 7; offset++) {
    const checkDay = (currentDay + offset) % 7;
    const ds = schedule.find((s) => s.day === checkDay);
    if (!ds) continue;
    const [sh, sm] = ds.start.split(":").map(Number);
    if (offset === 0 && sh * 60 + sm <= currentMins) continue;
    const dayName = DAYS_RO.find((d) => d.value === checkDay)?.long ?? "";
    if (offset === 0) return `azi la ${ds.start}`;
    if (offset === 1) return `mâine la ${ds.start}`;
    return `${dayName} la ${ds.start}`;
  }
  return null;
}

export function formatScheduleSummary(schedule: DaySchedule[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return [...schedule]
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day))
    .map(
      (s) =>
        `${DAYS_RO.find((d) => d.value === s.day)?.short}: ${s.start}–${s.end}`,
    )
    .join("  ");
}
