import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import {
  formatUfrnDayLabel,
  formatUfrnTime,
  ufrnDayKey,
} from "@/lib/datetime";
import { ReserveButton } from "./_components/reserve-button";
import { CancelButton } from "./_components/cancel-button";

// Slots mudam com reservas; sempre buscar dados frescos.
export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const user = await requireUserPage();

  const slots = await prisma.slot.findMany({
    orderBy: { startsAt: "asc" },
    include: { reservation: { include: { student: true } } },
  });

  // Reserva ativa do próprio aluno (para destaque e aviso de 1-por-aluno).
  const myReservation = await prisma.reservation.findUnique({
    where: { studentId: user.id },
    include: { slot: true },
  });

  // Agrupa por dia (UTC-3), preservando a ordem cronológica.
  const groups = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = ufrnDayKey(slot.startsAt);
    const list = groups.get(key);
    if (list) list.push(slot);
    else groups.set(key, [slot]);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Horários de prova</h1>
        <p className="text-sm text-zinc-500">
          Horários no fuso da UFRN (UTC-3).
        </p>
        {myReservation ? (
          <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Você tem uma reserva ativa em{" "}
            <strong>
              {formatUfrnDayLabel(myReservation.slot.startsAt)} às{" "}
              {formatUfrnTime(myReservation.slot.startsAt)}
            </strong>
            . Para reservar outro horário, cancele esta primeiro.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Você ainda não tem reserva. Pode reservar 1 horário livre.
          </p>
        )}
      </header>

      {slots.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          Nenhum horário disponível ainda.
        </p>
      )}

      {[...groups.entries()].map(([key, daySlots]) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold capitalize text-zinc-700">
            {formatUfrnDayLabel(daySlots[0].startsAt)}
          </h2>
          <ul className="flex flex-col gap-2">
            {daySlots.map((slot) => {
              const isMine = slot.reservation?.studentId === user.id;
              const occupied = Boolean(slot.reservation);
              const isPast = slot.startsAt.getTime() <= Date.now();
              return (
                <li
                  key={slot.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                    isMine
                      ? "border-blue-300 bg-blue-50"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatUfrnTime(slot.startsAt)} · {slot.durationMin} min
                    </span>
                    <span className="text-xs text-zinc-500">
                      {slot.location ?? "Local a definir"}
                      {slot.note ? ` · ${slot.note}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge
                      isMine={isMine}
                      occupied={occupied}
                      studentLabel={
                        slot.reservation
                          ? slot.reservation.student.name ??
                            slot.reservation.student.email
                          : null
                      }
                    />

                    {/* Própria reserva: cancelar. Slot livre e futuro: reservar
                        (desabilitado se o aluno já tem reserva ativa). */}
                    {isMine && slot.reservation ? (
                      <CancelButton reservationId={slot.reservation.id} />
                    ) : !occupied && !isPast ? (
                      <ReserveButton
                        slotId={slot.id}
                        disabled={Boolean(myReservation)}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}

function StatusBadge({
  isMine,
  occupied,
  studentLabel,
}: {
  isMine: boolean;
  occupied: boolean;
  studentLabel: string | null;
}) {
  if (isMine) {
    return (
      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
        ★ Sua reserva
      </span>
    );
  }
  if (occupied) {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Ocupado · {studentLabel}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
      Livre
    </span>
  );
}
