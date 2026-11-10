export interface OutboxEventInput {
  companyId: string;
  aggregateType: string;
  aggregateId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
  eventId?: string;
  occurredAt?: Date;
}

export interface OutboxEventRow {
  id: string;
  event_id: string;
  company_id: string;
  aggregate_type: string;
  aggregate_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  attempts: number;
}

export type OutboxHandler = (event: OutboxEventRow) => Promise<void>;
