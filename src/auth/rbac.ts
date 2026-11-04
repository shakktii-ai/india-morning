export function requireRole(userRole: string, allowed: string[]) {
  if (!allowed.includes(userRole)) {
    const err = new Error("Forbidden");
    (err as any).status = 403;
    throw err;
  }
}
