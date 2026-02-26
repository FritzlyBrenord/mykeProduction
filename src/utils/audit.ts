export interface AuditLogInput {
  action: string;
  tableName: string;
  rowId: string;
  before: string | null;
  after: string | null;
}

export function toAuditPayload(input: AuditLogInput) {
  return {
    action: input.action,
    table_name: input.tableName,
    row_id: input.rowId,
    old_values: input.before,
    new_values: input.after,
  };
}
