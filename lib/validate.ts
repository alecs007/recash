export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}
