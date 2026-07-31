export const PROTECTED_VALUE = "Protegido";

function plainObject(value) {
  if (!value) return {};
  return value.toJSON ? value.toJSON() : { ...value };
}

function protectedValue(value) {
  return String(value || "").trim() ? PROTECTED_VALUE : "";
}

export function protectUserFields(user, reveal = false) {
  const clean = plainObject(user);
  delete clean.passwordHash;
  delete clean.verificationTokenHash;
  delete clean.resetTokenHash;
  delete clean.resetExpiresAt;
  delete clean.__v;

  if (!reveal) {
    clean.email = protectedValue(clean.email);
    clean.phone = protectedValue(clean.phone);
  }

  clean.sensitiveDataVisible = Boolean(reveal);
  return clean;
}

export function protectRegistration(registration, reveal = false) {
  const clean = plainObject(registration);
  const participant = { ...(clean.participant || {}) };
  const group = clean.group ? { ...clean.group } : clean.group;

  if (!reveal) {
    for (const field of ["email", "cpf", "phone", "certificateEmail", "accessibility", "teacherCardCode"]) {
      participant[field] = protectedValue(participant[field]);
    }

    if (group) {
      for (const field of ["responsibleEmail", "responsiblePhone", "certificateEmail", "notes"]) {
        group[field] = protectedValue(group[field]);
      }
    }

    clean.details = {};
    clean.changeHistory = [];
  }

  clean.participant = participant;
  clean.group = group;
  clean.sensitiveDataVisible = Boolean(reveal);
  return clean;
}

export function protectGroup(group, reveal = false) {
  return protectRegistration({ participant: {}, group }, reveal).group;
}

export function protectValue(value, reveal = false) {
  return reveal ? String(value || "") : protectedValue(value);
}
