import type { Database as RawDatabase } from "./database";

type EnsureSupabaseTable<TTable> =
  TTable extends {
    Row: infer Row;
    Insert: infer Insert;
    Update: infer Update;
    Relationships: infer Relationships;
  }
    ? {
        Row: Row;
        Insert: Insert;
        Update: Update;
        Relationships: Relationships;
      }
    : TTable extends {
          Row: infer Row;
          Insert: infer Insert;
          Update: infer Update;
        }
      ? {
          Row: Row;
          Insert: Insert;
          Update: Update;
          Relationships: [];
        }
      : TTable extends {
            Row: infer Row;
          }
        ? {
            Row: Row;
            Insert: Partial<Row>;
            Update: Partial<Row>;
            Relationships: [];
          }
        : never;

type NormalizeSchema<TSchema> =
  TSchema extends {
    Tables: infer Tables;
    Views: infer Views;
    Functions: infer Functions;
    Enums: infer Enums;
    CompositeTypes: infer CompositeTypes;
  }
    ? {
        Tables: {
          [TName in keyof Tables]: EnsureSupabaseTable<Tables[TName]>;
        };
        Views: Views;
        Functions: Functions;
        Enums: Enums;
        CompositeTypes: CompositeTypes;
      }
    : never;

export type Database = {
  [SchemaName in keyof RawDatabase]: NormalizeSchema<RawDatabase[SchemaName]>;
};

