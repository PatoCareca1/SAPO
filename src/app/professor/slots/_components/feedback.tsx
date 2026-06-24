"use client";

import type { SlotActionState } from "@/lib/server/slots";

export function Feedback({ state }: { state: SlotActionState }) {
  if (state.error) {
    return <p className="text-sm text-red-600">{state.error}</p>;
  }
  if (state.ok && state.message) {
    return <p className="text-sm text-green-700">{state.message}</p>;
  }
  return null;
}
