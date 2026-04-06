export function isBool(text: string | null): boolean {
  return (text ?? "").toUpperCase() == 'TRUE'
}