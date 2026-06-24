import { prisma } from "@/lib/prisma";
import { requireProfessorPage } from "@/lib/auth";
import { formatUfrn, utcToLocalInput } from "@/lib/datetime";
import {
  CreateBatchForm,
  CreateSlotForm,
} from "./_components/create-forms";
import { SlotTable, type SlotView } from "./_components/slot-table";

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
          id: slot.reservation.id,
          studentEmail: slot.reservation.student.email,
          studentName: slot.reservation.student.name,
        }
      : null,
  }));

  return (
    <div className="page-wrapper">
      <header>
        <h1 className="page-title">Gerenciar Slots</h1>
        <p className="page-subtitle">
          Crie horários individualmente ou em lote, e edite os existentes.
        </p>
      </header>

      {/* Formulários lado a lado */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", gap: "1.25rem" }}>
        <CreateSlotForm />
        <CreateBatchForm />
      </div>

      {/* Tabela de slots */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Slots ({view.length})
        </h2>
        <SlotTable slots={view} />
      </section>
    </div>
  );
}
