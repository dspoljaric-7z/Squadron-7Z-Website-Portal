export function roleLabel(role: string): string {
  switch (role) {
    case "officer":
      return "Officer";
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

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
