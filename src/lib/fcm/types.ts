import type { Entry } from '../types';

/**
 * The three FCM `data` payload shapes defined by AD-3 (ARCHITECTURE-SPINE.md).
 * `data.type` always discriminates which shape a given message carries — this
 * union is the compile-time contract every FCM consumer narrows against,
 * starting here with `onForegroundMessage`'s console-log-only listener
 * (Story 2.1). Later stories (2.4+) add the feature-level dispatch that reads
 * `entry`/`senderName`/`entryId`; this spike only needs the shape to exist and
 * type-check, not to be fully consumed yet.
 */
export type RoundTripResultPayload = {
  type: 'round_trip_result';
  entryId: string;
  entry: Entry;
};

export type InvoiceUnknownPayload = {
  type: 'invoice_unknown';
  entryId: string;
  senderName: string;
};

export type InvoiceKnownPayload = {
  type: 'invoice_known';
  entryId: string;
};

export type FcmDataPayload = RoundTripResultPayload | InvoiceUnknownPayload | InvoiceKnownPayload;
