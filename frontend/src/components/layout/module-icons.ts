import type { Component } from 'vue';
import {
  IconActivity,
  IconBell,
  IconBook,
  IconCalculator,
  IconChartHistogram,
  IconClipboardList,
  IconFileText,
  IconFolders,
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
  notifications: IconBell,
  documents: IconFileText,
  operations: IconActivity,
  parties: IconUsers,
  catalog: IconBook,
  projects: IconFolders,
  estimating: IconCalculator,
};

export function moduleIcon(token?: string): Component {
  return (token && ICONS[token]) || IconPuzzle;
}
