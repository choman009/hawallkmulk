import type { WorkspaceData, RecordTable } from "./domain";
export type DeletableTable = RecordTable | "assignments";

export function deleteDemoRecord(
  data: WorkspaceData,
  table: DeletableTable,
  id: string,
): WorkspaceData {
  const next = structuredClone(data);
  const removedTasks = new Set(
    next.assignments
      .filter((a) =>
        table === "assignments"
          ? a.id === id
          : table === "properties"
            ? a.property_id === id
            : table === "client_requests"
              ? a.request_id === id
              : false,
      )
      .map((a) => a.id),
  );
  next.assignments = next.assignments.filter((a) => !removedTasks.has(a.id));
  next.assignment_updates = next.assignment_updates.filter(
    (u) => !removedTasks.has(u.assignment_id),
  );
  if (table === "properties")
    next.properties = next.properties.filter((r) => r.id !== id);
  if (table === "client_requests")
    next.client_requests = next.client_requests.filter((r) => r.id !== id);
  if (table === "partner_offices")
    next.partner_offices = next.partner_offices.filter((r) => r.id !== id);
  if (table === "properties") {
    next.property_images = next.property_images.filter(
      (i) => i.property_id !== id,
    );
    next.client_requests = next.client_requests.map((r) =>
      r.property_id === id ? { ...r, property_id: null } : r,
    );
  }
  if (table === "partner_offices") {
    next.properties = next.properties.map((r) =>
      r.source_office_id === id ? { ...r, source_office_id: null } : r,
    );
    next.client_requests = next.client_requests.map((r) =>
      r.source_office_id === id ? { ...r, source_office_id: null } : r,
    );
  }
  next.record_sources = next.record_sources?.filter((s) => s.record_id !== id);
  return next;
}
