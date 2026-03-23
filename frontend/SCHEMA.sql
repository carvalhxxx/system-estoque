-- ============================================================
-- SISTEMA DE ESTOQUE - SCHEMA COMPLETO
-- ============================================================

-- ------------------------------------------------------------
-- FUNÇÃO UTILITÁRIA: atualiza updated_at automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABELA: movement_types
-- Tipos de movimentação configuráveis pelo usuário
-- ============================================================
CREATE TABLE public.movement_types (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code                  TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  operation             CHAR(1)     NOT NULL CHECK (operation IN ('+', '-')),
  requires_justification BOOLEAN    NOT NULL DEFAULT false,
  active                BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, code)
);

CREATE TRIGGER movement_types_updated_at
  BEFORE UPDATE ON public.movement_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.movement_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement_types_select" ON public.movement_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "movement_types_insert" ON public.movement_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "movement_types_update" ON public.movement_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "movement_types_delete" ON public.movement_types FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: categories (opcional - para categorizar produtos)
-- ============================================================
CREATE TABLE public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: products
-- ============================================================
CREATE TABLE public.products (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID           REFERENCES public.categories(id) ON DELETE SET NULL,
  name          TEXT           NOT NULL,
  sku           TEXT,
  description   TEXT,
  unit          TEXT           NOT NULL DEFAULT 'un',
  cost_price    NUMERIC(10,2),
  sale_price    NUMERIC(10,2),
  current_stock NUMERIC(10,3)  NOT NULL DEFAULT 0,
  min_stock     NUMERIC(10,3)  NOT NULL DEFAULT 0,
  -- location_id UUID NULL -- reservado para suporte futuro a múltiplos locais
  active        BOOLEAN        NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, sku)
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_user_id    ON public.products(user_id);
CREATE INDEX idx_products_category   ON public.products(category_id);
CREATE INDEX idx_products_low_stock  ON public.products(user_id) WHERE active = true;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: movements
-- IMUTÁVEL — sem updated_at, sem UPDATE/DELETE policies
-- ============================================================
CREATE TABLE public.movements (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       UUID           NOT NULL REFERENCES public.products(id),
  movement_type_id UUID           NOT NULL REFERENCES public.movement_types(id),
  quantity         NUMERIC(10,3)  NOT NULL CHECK (quantity > 0),
  justification    TEXT,
  ref_type         TEXT,          -- 'venda' | 'compra' | 'ajuste' | 'cancelamento' | 'perda'
  ref_id           UUID,          -- id da entidade de origem (ex: order_id)
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
  -- SEM updated_at — movimentações são imutáveis
);

CREATE INDEX idx_movements_product    ON public.movements(product_id);
CREATE INDEX idx_movements_type       ON public.movements(movement_type_id);
CREATE INDEX idx_movements_user       ON public.movements(user_id);
CREATE INDEX idx_movements_created_at ON public.movements(created_at DESC);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_select" ON public.movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "movements_insert" ON public.movements FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Sem UPDATE e DELETE policy: movimentações são imutáveis

-- ============================================================
-- FUNÇÃO + TRIGGER: process_movement
-- Valida e aplica a movimentação no estoque atomicamente
-- ============================================================
CREATE OR REPLACE FUNCTION process_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_operation             CHAR(1);
  v_requires_justification BOOLEAN;
  v_current_stock         NUMERIC;
BEGIN
  -- Busca informações do tipo de movimentação
  SELECT operation, requires_justification
  INTO   v_operation, v_requires_justification
  FROM   public.movement_types
  WHERE  id = NEW.movement_type_id;

  -- Valida justificativa quando obrigatória
  IF v_requires_justification AND (NEW.justification IS NULL OR trim(NEW.justification) = '') THEN
    RAISE EXCEPTION 'Justificativa obrigatória para este tipo de movimentação';
  END IF;

  -- Busca estoque atual com lock para evitar race condition
  SELECT current_stock
  INTO   v_current_stock
  FROM   public.products
  WHERE  id = NEW.product_id
  FOR UPDATE;

  -- Bloqueia saída com saldo insuficiente
  IF v_operation = '-' AND v_current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Saldo insuficiente. Estoque atual: %, Quantidade solicitada: %',
      v_current_stock, NEW.quantity;
  END IF;

  -- Atualiza estoque
  UPDATE public.products
  SET
    current_stock = CASE
      WHEN v_operation = '+' THEN current_stock + NEW.quantity
      ELSE                        current_stock - NEW.quantity
    END,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_movement
  BEFORE INSERT ON public.movements
  FOR EACH ROW EXECUTE FUNCTION process_movement();

-- ============================================================
-- FUNÇÃO: cancel_movement
-- Gera movimentação inversa para cancelar uma movimentação
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_movement(
  p_movement_id UUID,
  p_user_id     UUID,
  p_justification TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_movement     public.movements%ROWTYPE;
  v_mt_operation CHAR(1);
  v_inverse_type UUID;
  v_new_id       UUID;
BEGIN
  -- Busca a movimentação original
  SELECT * INTO v_movement
  FROM public.movements
  WHERE id = p_movement_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação não encontrada';
  END IF;

  -- Descobre a operação do tipo original
  SELECT operation INTO v_mt_operation
  FROM public.movement_types
  WHERE id = v_movement.movement_type_id;

  -- Busca um tipo de movimentação com operação inversa pertencente ao usuário
  -- Prioriza tipos com code AJUSTE_POS/AJUSTE_NEG, senão pega qualquer um ativo
  SELECT id INTO v_inverse_type
  FROM public.movement_types
  WHERE user_id = p_user_id
    AND active  = true
    AND operation = CASE WHEN v_mt_operation = '+' THEN '-' ELSE '+' END
    AND code IN ('AJUSTE_NEG', 'AJUSTE_POS', 'CANCELAMENTO')
  ORDER BY
    CASE code WHEN 'CANCELAMENTO' THEN 0 WHEN 'AJUSTE_NEG' THEN 1 WHEN 'AJUSTE_POS' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_inverse_type IS NULL THEN
    RAISE EXCEPTION 'Nenhum tipo de movimentação inversa disponível';
  END IF;

  -- Insere movimentação inversa
  INSERT INTO public.movements (
    user_id, product_id, movement_type_id,
    quantity, justification, ref_type, ref_id
  ) VALUES (
    p_user_id,
    v_movement.product_id,
    v_inverse_type,
    v_movement.quantity,
    COALESCE(p_justification, 'Cancelamento da movimentação ' || p_movement_id),
    'cancelamento',
    p_movement_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_movement(UUID, UUID, TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION cancel_movement(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- DADOS INICIAIS: tipos de movimentação padrão
-- (executar após criar o usuário no Supabase Auth)
-- Substitua 'USER_ID_AQUI' pelo UUID real do usuário
-- ============================================================
/*
INSERT INTO public.movement_types (user_id, code, description, operation, requires_justification) VALUES
  ('USER_ID_AQUI', 'COMPRA',      'Entrada por compra',              '+', false),
  ('USER_ID_AQUI', 'VENDA',       'Saída por venda',                 '-', false),
  ('USER_ID_AQUI', 'AJUSTE_POS',  'Ajuste positivo de estoque',      '+', true),
  ('USER_ID_AQUI', 'AJUSTE_NEG',  'Ajuste negativo de estoque',      '-', true),
  ('USER_ID_AQUI', 'PERDA',       'Perda / avaria',                  '-', true),
  ('USER_ID_AQUI', 'CANCELAMENTO','Cancelamento de movimentação',    '+', true);
*/
