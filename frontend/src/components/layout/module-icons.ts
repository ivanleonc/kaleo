import type { Component } from 'vue';
import {
  IconChartHistogram,
  IconClipboardList,
  IconLayoutDashboard,
  IconPuzzle,
  IconSettings,
  IconShieldLock,
  IconUsers,
  IconBuildingCommunity,
} from '@tabler/icons-vue';

const ICONS: Record<string, Component> = {
  dashboard: IconLayoutDashboard,
  analyses: IconChartHistogram,
  users: IconUsers,
  branches: IconBuildingCommunity,
  roles: IconShieldLock,
  audit: IconClipboardList,
  settings: IconSettings,
};

export function moduleIcon(token?: string): Component {
  return (token && ICONS[token]) || IconPuzzle;
}
