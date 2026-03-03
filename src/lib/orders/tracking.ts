export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderItemStatus =
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface TrackingEvent {
  status: OrderStatus;
  label: string;
  at: string;
  note?: string;
}

const TRACKING_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered'];

const STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
  refunded: 6,
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const ITEM_ALLOWED_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  paid: ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
  processing: ['shipped', 'delivered', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function orderStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'paid':
      return 'Payee';
    case 'processing':
      return 'En preparation';
    case 'shipped':
      return 'Expediee';
    case 'delivered':
      return 'Livree';
    case 'cancelled':
      return 'Annulee';
    case 'refunded':
      return 'Remboursee';
    default:
      return status;
  }
}

export function orderItemStatusLabel(status: string) {
  if (status === 'paid') return 'Paye';
  if (status === 'processing') return 'En preparation';
  if (status === 'shipped') return 'Expedie';
  if (status === 'delivered') return 'Livre';
  if (status === 'cancelled') return 'Annule';
  if (status === 'refunded') return 'Rembourse';
  return status;
}

export function orderProgressPercent(status: string) {
  switch (status) {
    case 'paid':
      return 28;
    case 'processing':
      return 52;
    case 'shipped':
      return 80;
    case 'delivered':
      return 100;
    case 'cancelled':
    case 'refunded':
      return 100;
    case 'pending':
    default:
      return 12;
  }
}

export function orderItemProgressPercent(status: string) {
  if (status === 'paid') return 25;
  if (status === 'processing') return 55;
  if (status === 'shipped') return 82;
  if (status === 'delivered' || status === 'cancelled' || status === 'refunded') return 100;
  return 12;
}

export function canTransitionOrderStatus(current: string, next: string) {
  const from = current as OrderStatus;
  const to = next as OrderStatus;
  if (!ALLOWED_TRANSITIONS[from]) return false;
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canTransitionOrderItemStatus(current: string, next: string) {
  const from = current as OrderItemStatus;
  const to = next as OrderItemStatus;
  if (!ITEM_ALLOWED_TRANSITIONS[from]) return false;
  if (from === to) return true;
  return ITEM_ALLOWED_TRANSITIONS[from].includes(to);
}

export function deriveOrderStatusFromItems(
  items: Array<{ item_status?: string | null }> | null | undefined,
): OrderStatus {
  const statuses = (items ?? [])
    .map((item) => item.item_status)
    .filter((status): status is OrderItemStatus => Boolean(status)) as OrderItemStatus[];

  if (statuses.length === 0) return 'pending';
  if (statuses.every((status) => status === 'refunded')) return 'refunded';
  if (statuses.every((status) => status === 'cancelled' || status === 'refunded')) {
    return statuses.some((status) => status === 'cancelled') ? 'cancelled' : 'refunded';
  }
  const allTerminal = statuses.every((status) =>
    status === 'delivered' || status === 'cancelled' || status === 'refunded',
  );
  if (allTerminal) {
    return statuses.some((status) => status === 'delivered') ? 'delivered' : 'cancelled';
  }
  if (statuses.some((status) => status === 'shipped')) return 'shipped';
  if (statuses.some((status) => status === 'processing')) return 'processing';
  if (statuses.some((status) => status === 'delivered')) return 'processing';
  return 'paid';
}

export function statusActionLabel(nextStatus: string) {
  if (nextStatus === 'processing') return 'Passer en preparation';
  if (nextStatus === 'shipped') return 'Marquer expediee';
  if (nextStatus === 'delivered') return 'Marquer livree';
  return null;
}

function parseDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function normalizeTrackingTimeline(value: unknown): TrackingEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const status = typeof row.status === 'string' ? row.status : '';
      if (!TRACKING_STATUSES.includes(status as OrderStatus) && status !== 'cancelled' && status !== 'refunded') {
        return null;
      }

      const at = parseDate(row.at ?? row.date);
      if (!at) return null;

      const label =
        typeof row.label === 'string' && row.label.trim().length > 0
          ? row.label.trim().slice(0, 120)
          : orderStatusLabel(status);

      const note =
        typeof row.note === 'string' && row.note.trim().length > 0
          ? row.note.trim().slice(0, 240)
          : undefined;

      return {
        status: status as OrderStatus,
        label,
        at,
        note,
      } satisfies TrackingEvent;
    })
    .filter((event): event is TrackingEvent => Boolean(event))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function appendTrackingEvent(
  timelineRaw: unknown,
  event: Omit<TrackingEvent, 'label'> & { label?: string },
) {
  const timeline = normalizeTrackingTimeline(timelineRaw);
  const label = event.label?.trim() || orderStatusLabel(event.status);
  timeline.push({
    status: event.status,
    label,
    at: event.at,
    note: event.note,
  });

  const deduped = new Map<string, TrackingEvent>();
  timeline.forEach((item) => {
    const key = `${item.status}:${item.at}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  });

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export function buildTrackingTimelineFromOrder(order: {
  status: string;
  created_at?: string | null;
  processing_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  tracking_timeline?: unknown;
}) {
  const timeline = normalizeTrackingTimeline(order.tracking_timeline);
  if (timeline.length > 0) return timeline;

  const fallback: TrackingEvent[] = [];
  if (order.created_at) {
    fallback.push({
      status: order.status === 'pending' ? 'pending' : 'paid',
      label: order.status === 'pending' ? 'Commande creee' : 'Paiement confirme',
      at: order.created_at,
    });
  }
  if (order.processing_at) {
    fallback.push({
      status: 'processing',
      label: 'Commande en preparation',
      at: order.processing_at,
    });
  }
  if (order.shipped_at) {
    fallback.push({
      status: 'shipped',
      label: 'Commande expediee',
      at: order.shipped_at,
    });
  }
  if (order.delivered_at) {
    fallback.push({
      status: 'delivered',
      label: 'Commande livree',
      at: order.delivered_at,
    });
  }
  if (order.cancelled_at) {
    fallback.push({
      status: 'cancelled',
      label: order.status === 'refunded' ? 'Commande remboursee' : 'Commande annulee',
      at: order.cancelled_at,
    });
  }

  return fallback.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function trackingStageState(stageStatus: OrderStatus, currentStatus: string) {
  const current = currentStatus as OrderStatus;
  if (!(current in STATUS_INDEX)) {
    return stageStatus === 'paid' ? 'current' : 'upcoming';
  }

  if (current === 'cancelled' || current === 'refunded') {
    return stageStatus === 'paid' ? 'done' : 'upcoming';
  }

  const stageIndex = STATUS_INDEX[stageStatus] ?? 0;
  const currentIndex = STATUS_INDEX[current] ?? 0;
  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'current';
  return 'upcoming';
}

export const ORDER_TRACKING_STAGES: Array<{ status: OrderStatus; label: string }> = [
  { status: 'paid', label: 'Paiement valide' },
  { status: 'processing', label: 'En preparation' },
  { status: 'shipped', label: 'Expediee' },
  { status: 'delivered', label: 'Livree' },
];
