import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import { formatUfrnDayLabel, formatUfrnTime } from "@/lib/datetime";
import { CancelButton } from "@/app/slots/_components/cancel-button";

export const dynamic = "force-dynamic";

export default async function MyReservationPage() {
  const user = await requireUserPage();

  const reservation = await prisma.reservation.findUnique({
    where: { studentId: user.id },
    include: { slot: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Minha reserva</h1>
        <p className="text-sm text-zinc-500">Horário no fuso da UFRN (UTC-3).</p>
      </header>

      {reservation ? (
        <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-medium capitalize">
              {formatUfrnDayLabel(reservation.slot.startsAt)}
            </span>
            <span className="text-2xl font-semibold">
              {formatUfrnTime(reservation.slot.startsAt)}
            </span>
            <span className="text-sm text-zinc-600">
              Duração: {reservation.slot.durationMin} min
            </span>
            {reservation.slot.location && (
              <span className="text-sm text-zinc-600">
                Local: {reservation.slot.location}
              </span>
            )}
            {reservation.slot.note && (
              <span className="text-sm text-zinc-600">
                Obs.: {reservation.slot.note}
              </span>
            )}
          </div>
          <div>
            <CancelButton
              reservationId={reservation.id}
              label="Cancelar reserva"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-300 p-6">
          <p className="text-sm text-zinc-600">
            Você ainda não tem uma reserva ativa.
          </p>
          <Link
            href="/slots"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Ver horários disponíveis
          </Link>
        </div>
      )}
    </main>
  );
}
