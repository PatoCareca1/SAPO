// Timezone: o banco guarda SEMPRE UTC. A UFRN opera em America/Recife (UTC-3,
// sem horário de verão). Estas funções fazem a ponte entre o input do professor
// (hora local, sem fuso, vindo de <input type="datetime-local">) e o UTC, e a
// exibição de volta em UTC-3.

export const UFRN_TIME_ZONE = "America/Recife";

// Offset fixo da UFRN em horas (UTC-3). Recife/Fortaleza não usam horário de
// verão, então um offset fixo é correto para a CONVERSÃO de input → UTC.
const UFRN_OFFSET_HOURS = -3;

// Interpreta uma string "YYYY-MM-DDTHH:mm" (sem fuso) como hora local da UFRN
// e devolve o instante UTC correspondente.
export function localInputToUtc(local: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) {
    throw new Error("Data/hora inválida");
  }
  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];
  // Date.UTC monta o timestamp tratando os campos como se fossem UTC; como na
  // verdade são hora local (UTC-3), subtraímos o offset para obter o UTC real.
  const wallClockAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  return new Date(wallClockAsUtc - UFRN_OFFSET_HOURS * 3_600_000);
}

// Formata um instante UTC para exibição em UTC-3 (ex.: "23/06/2026 14:00").
export function formatUfrn(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: UFRN_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// Chave de dia em UTC-3 ("YYYY-MM-DD"), para agrupar slots por data.
export function ufrnDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UFRN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Rótulo de dia em UTC-3 (ex.: "terça-feira, 23/06/2026").
export function formatUfrnDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: UFRN_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// Apenas o horário em UTC-3 (ex.: "14:00").
export function formatUfrnTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: UFRN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Converte um instante UTC de volta para o formato de <input type="datetime-local">
// (hora de parede em UTC-3), para preencher formulários de edição.
export function utcToLocalInput(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UFRN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
