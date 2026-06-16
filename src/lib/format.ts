export function roleLabel(role: string): string {
  switch (role) {
    case "officer":
      return "Officer";
    case "snco":
      return "Senior NCO";
    case "nco":
      return "NCO";
    case "cadet":
      return "Cadet";
    case "parent":
      return "Parent/Guardian";
    default:
      return role;
  }
}

export const ROLE_ORDER: Record<string, number> = {
  officer: 0,
  snco: 1,
  nco: 2,
  cadet: 3,
  parent: 4,
};

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
