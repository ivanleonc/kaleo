import type { Component } from 'vue';

/** Paleta común a todos los estados mostrados como chip. */
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface UiTabItem {
  value: string;
  label: string;
  icon?: Component;
  count?: number | string;
}

export type UiSelectValue = string | number;

export type UiSelectTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface UiSelectOption {
  label: string;
  value: UiSelectValue;
  description?: string;
  group?: string;
  tone?: UiSelectTone;
  disabled?: boolean;
  keywords?: string[];
}
