/* eslint-disable vue/one-component-per-file -- hosts de prueba para montar tablas */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import ResourceTable from '@/components/estimating/ResourceTable.vue';
import BudgetItemsTable from '@/components/budgets/BudgetItemsTable.vue';
import ScheduleTable from '@/components/execution/ScheduleTable.vue';
import { useAppTable } from '@/composables/useAppTable';
import { useResourceColumns } from '@/composables/useEstimatingColumns';
import { useBudgetItemColumns } from '@/composables/useBudgetColumns';
import { useScheduleColumns } from '@/composables/useExecutionColumns';
import type { Resource } from '@/types/estimating';
import type { BudgetTreeRow } from '@/types/budget';
import type { ScheduleActivity } from '@/types/execution';

const RESOURCE = {
  id: 'res-1',
  company_id: 'company-1',
  resource_type: 'material',
  code: 'MAT-CEM-001',
  name: 'Cemento gris 50 kg',
  description: 'Bolsa de 50 kg',
  unit_id: 'unit-1',
  unit_code: 'un',
  unit_name: 'Unidad',
  base_cost: 32500,
  currency_code: 'COP',
  catalog_item_id: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  deleted_at: null,
} as Resource;

const BUDGET_ROWS = [
  {
    id: 'chapter-1',
    code: '01',
    name: 'Preliminares',
    item_type: 'chapter',
    depth: 0,
    has_children: true,
    quantity: 0,
    unit_price: 0,
    partial_amount: 0,
    assigned_user_name: null,
    apu_id: null,
  },
  {
    id: 'activity-1',
    code: 'PRE-002',
    name: 'Cerramiento provisional',
    item_type: 'activity',
    depth: 1,
    has_children: false,
    quantity: 120,
    unit_price: 45000,
    partial_amount: 5400000,
    assigned_user_name: 'Ana',
    apu_id: null,
  },
] as unknown as BudgetTreeRow[];

const SCHEDULE = [
  {
    id: 'act-1',
    name: 'Cimentación',
    start_date: '2026-01-01',
    end_date: '2026-02-01',
    progress_pct: 40,
    status: 'in_progress',
    notes: null,
  },
] as unknown as ScheduleActivity[];

describe('Tablas de Construcción sobre UiDataTable', () => {
  it('renderiza los recursos con sus columnas y formato monetario', () => {
    const Host = defineComponent({
      components: { ResourceTable },
      setup() {
        const table = useAppTable<Resource>({
          columns: useResourceColumns(),
          data: ref([RESOURCE]),
        });
        return { table };
      },
      template: '<ResourceTable :table="table" />',
    });

    const wrapper = mount(Host);
    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.text()).toContain('MAT-CEM-001');
    expect(wrapper.text()).toContain('Cemento gris 50 kg');
    expect(wrapper.text()).toContain('Material');
    expect(wrapper.text()).toMatch(/32\.500/);
  });

  it('resalta capítulos y mantiene la cantidad editable en actividades', () => {
    const Host = defineComponent({
      components: { BudgetItemsTable },
      setup() {
        const table = useAppTable<BudgetTreeRow>({
          columns: useBudgetItemColumns(),
          data: ref(BUDGET_ROWS),
        });
        return { table, expanded: ref(new Set(['chapter-1'])) };
      },
      template: `<BudgetItemsTable
        :table="table"
        :expanded="expanded"
        :editable="true"
        currency="COP"
      />`,
    });

    const wrapper = mount(Host);
    expect(wrapper.find('tr.is-chapter-row').exists()).toBe(true);
    const inputs = wrapper.findAll('input[type="number"]');
    // Actividad: cantidad y valor unitario.
    expect(inputs).toHaveLength(2);
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('120');
  });

  it('muestra el avance como progressbar accesible', () => {
    const Host = defineComponent({
      components: { ScheduleTable },
      setup() {
        const table = useAppTable<ScheduleActivity>({
          columns: useScheduleColumns(),
          data: ref(SCHEDULE),
        });
        return { table };
      },
      template: '<ScheduleTable :table="table" />',
    });

    const wrapper = mount(Host);
    const bar = wrapper.find('[role="progressbar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.attributes('aria-valuenow')).toBe('40');
    expect(wrapper.text()).toContain('En progreso');
  });
});
