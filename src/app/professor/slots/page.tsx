import { prisma } from "@/lib/prisma";
import { requireProfessorPage } from "@/lib/auth";
import { formatUfrn, utcToLocalInput } from "@/lib/datetime";
import {
  CreateBatchForm,
  CreateSlotForm,
} from "./_components/create-forms";
import { SlotTable, type SlotView } from "./_components/slot-table";

// Sempre buscar dados frescos (slots mudam com reservas/edições).
export const dynamic = "force-dynamic";

export default async function ManageSlotsPage() {
  await requireProfessorPage();

  const slots = await prisma.slot.findMany({
    orderBy: { startsAt: "asc" },
    include: { reservation: { include: { student: true } } },
  });

  const view: SlotView[] = slots.map((slot) => ({
    id: slot.id,
    startsAtLocalInput: utcToLocalInput(slot.startsAt),
    startsAtDisplay: formatUfrn(slot.startsAt),
    durationMin: slot.durationMin,
    location: slot.location,
    note: slot.note,
    reservation: slot.reservation
      ? {
          studentEmail: slot.reservation.student.email,
          studentName: slot.reservation.student.name,
        }
      : null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Gerenciar slots</h1>
        <p className="text-sm text-zinc-500">
          Horários exibidos no fuso da UFRN (UTC-3). Toda ação é registrada na
          auditoria.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <CreateSlotForm />
        <CreateBatchForm />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">
          Slots ({view.length})
        </h2>
        <SlotTable slots={view} />
      </section>
    </main>
  );
}
