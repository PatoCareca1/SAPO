function getAllowedDomains(): string[] {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS ?? "ufrn.edu.br,ufrn.br";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// Aceita o domínio exato ou qualquer subdomínio dele
// (ex.: "ufrn.edu.br" cobre "academico.ufrn.edu.br" e "alunos.ufrn.edu.br").
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  return getAllowedDomains().some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

function getProfessorEmails(): string[] {
  const raw = process.env.PROFESSOR_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isProfessorEmail(email: string): boolean {
  return getProfessorEmails().includes(email.toLowerCase());
}
