function cleanText(value, maxLength = 80) {
  return String(value || "").trim().slice(0, maxLength);
}

function toMinutes(value = "") {
  const match = cleanText(value, 5).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function detailsValue(details, key) {
  return cleanText(details?.get?.(key) ?? details?.[key], 80);
}

export function areaPeriods(area = {}) {
  return (Array.isArray(area.sessionOptions) ? area.sessionOptions : [])
    .map((period) => cleanText(period, 40))
    .filter(Boolean);
}

export function selectedAreaPeriod(area = {}, value = "") {
  const selected = cleanText(value, 40);
  return areaPeriods(area).includes(selected) ? selected : "";
}

export function areaTimeSlot(area = {}, period = "") {
  const slot = area.sessionSlots?.[period];
  const start = cleanText(slot?.start, 5);
  const end = cleanText(slot?.end, 5);
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
  return { start, end, startMinutes, endMinutes };
}

export function formatAreaTimeSlot(area = {}, period = "") {
  const slot = areaTimeSlot(area, period);
  return slot ? `${period} · ${slot.start} às ${slot.end}` : period;
}

export function registrationPeriod(registration = {}) {
  return detailsValue(registration.details, "period");
}

export function findAreaScheduleConflict({ area, period, registrations = [], areas = [] }) {
  const selectedSlot = areaTimeSlot(area, period);
  if (!selectedSlot) return null;

  for (const registration of registrations) {
    if (registration.status !== "confirmed" || registration.activitySlug === "main" || registration.activitySlug === area.slug) continue;

    const registeredArea = areas.find((item) => item.slug === registration.activitySlug);
    const registeredPeriod = registrationPeriod(registration);
    const registeredSlot = areaTimeSlot(registeredArea, registeredPeriod);
    if (!registeredArea || !registeredSlot) continue;

    const overlaps = selectedSlot.startMinutes < registeredSlot.endMinutes && registeredSlot.startMinutes < selectedSlot.endMinutes;
    if (overlaps) {
      return {
        area: registeredArea,
        period: registeredPeriod,
        slot: registeredSlot
      };
    }
  }

  return null;
}

export function scheduleConflictMessage(conflict) {
  return `Este horário coincide com ${conflict.area.title} (${formatAreaTimeSlot(conflict.area, conflict.period)}). Escolha outro horário.`;
}
