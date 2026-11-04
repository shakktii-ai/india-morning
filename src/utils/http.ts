import { ZodError } from "zod";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, { status: 200, ...init });
}

export function jsonCreated(data: unknown) {
  return Response.json(data, { status: 201 });
}

export function jsonError(message: string, status: number = 400, extra?: any) {
  return Response.json({ message, ...(extra ? { extra } : {}) }, { status });
}

export function formatZodError(e: ZodError): string {
  if (!e.errors || e.errors.length === 0) return "Validation error";
  // Just take the first error or join them
  return e.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
}

export function getErrorMessage(e: any): string {
  if (e instanceof ZodError) {
    return formatZodError(e);
  }
  return e?.message || "Unknown error";
}
