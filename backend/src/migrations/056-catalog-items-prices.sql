-- 056: Ítems de catálogo, categorías y listas de precios.
--
-- `catalog_items` es el maestro comercial (producto/servicio) que usarán
-- presupuestos, compras y facturación. `item_prices` guarda precios por lista,
-- cantidad mínima y vigencia; nunca se usa float para dinero.

CREATE TABLE IF NOT EXISTS public.item_categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_id   uuid,
    name        text NOT NULL,
    path        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, parent_id)
        REFERENCES public.item_categories(company_id, id) ON DELETE RESTRICT,
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_categories_root
    ON public.item_categories (company_id, lower(name))
    WHERE parent_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_categories_child
    ON public.item_categories (company_id, parent_id, lower(name))
    WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_categories_company
    ON public.item_categories (company_id, path)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_rates_company_id
    ON public.tax_rates (company_id, id);

CREATE TABLE IF NOT EXISTS public.catalog_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sku           text NOT NULL,
    name          text NOT NULL,
    description   text,
    item_type     text NOT NULL DEFAULT 'product'
        CHECK (item_type IN ('product', 'service')),
    category_id   uuid,
    unit_id       uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE RESTRICT,
    tax_rate_id   uuid,
    cost          numeric(18,6) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    price         numeric(18,6) NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency_code char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    is_stockable  boolean NOT NULL DEFAULT true,
    status        text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, category_id)
        REFERENCES public.item_categories(company_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (company_id, tax_rate_id)
        REFERENCES public.tax_rates(company_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_items_sku
    ON public.catalog_items (company_id, lower(sku))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_company_status
    ON public.catalog_items (company_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_category
    ON public.catalog_items (company_id, category_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.price_lists (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code          text NOT NULL,
    name          text NOT NULL,
    currency_code char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    is_default    boolean NOT NULL DEFAULT false,
    valid_from    date,
    valid_to      date,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    UNIQUE (company_id, id),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_price_lists_code
    ON public.price_lists (company_id, lower(code))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_price_lists_default
    ON public.price_lists (company_id)
    WHERE is_default AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.item_prices (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    price_list_id uuid NOT NULL,
    item_id       uuid NOT NULL,
    price         numeric(18,6) NOT NULL CHECK (price >= 0),
    min_quantity  numeric(18,6) NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
    valid_from    date,
    valid_to      date,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    UNIQUE (price_list_id, item_id, min_quantity),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from),
    FOREIGN KEY (company_id, price_list_id)
        REFERENCES public.price_lists(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, item_id)
        REFERENCES public.catalog_items(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_prices_list
    ON public.item_prices (company_id, price_list_id);
CREATE INDEX IF NOT EXISTS idx_item_prices_item
    ON public.item_prices (company_id, item_id);

DROP TRIGGER IF EXISTS trg_item_categories_updated_at ON public.item_categories;
CREATE TRIGGER trg_item_categories_updated_at
    BEFORE UPDATE ON public.item_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_catalog_items_updated_at ON public.catalog_items;
CREATE TRIGGER trg_catalog_items_updated_at
    BEFORE UPDATE ON public.catalog_items
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_price_lists_updated_at ON public.price_lists;
CREATE TRIGGER trg_price_lists_updated_at
    BEFORE UPDATE ON public.price_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_item_prices_updated_at ON public.item_prices;
CREATE TRIGGER trg_item_prices_updated_at
    BEFORE UPDATE ON public.item_prices
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS item_categories_tenant_isolation ON public.item_categories;
CREATE POLICY item_categories_tenant_isolation ON public.item_categories
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_items_tenant_isolation ON public.catalog_items;
CREATE POLICY catalog_items_tenant_isolation ON public.catalog_items
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_lists_tenant_isolation ON public.price_lists;
CREATE POLICY price_lists_tenant_isolation ON public.price_lists
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.item_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS item_prices_tenant_isolation ON public.item_prices;
CREATE POLICY item_prices_tenant_isolation ON public.item_prices
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
