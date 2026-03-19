-- NiKii Digital Academy - Phase 4 Migrations (10/10 Upgrade)

-- 1. Payments Table for Fee Tracking (Full/Installments)
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES public.registrations(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('Full', 'Installment 1', 'Installment 2')),
    date TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT
);

-- 2. Materials Table for Course Downloads
CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add Index for Performance
-- NiKii Digital Academy - Phase 4 Migrations (10/10 Upgrade)

-- 1. Payments Table for Fee Tracking (Full/Installments)
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES public.registrations(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('Full', 'Installment 1', 'Installment 2')),
    date TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT
);

-- 2. Materials Table for Course Downloads
CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add Index for Performance
CREATE INDEX IF NOT EXISTS idx_payments_reg_id ON public.payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON public.materials(course_id);

-- 6. Add syllabusUrl to courses table (March 2026 update)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "syllabusUrl" TEXT;

-- 7. Add discount_amount to registrations table (Admin feature)
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC DEFAULT 0;

-- 8. Add totalFee to courses table (Admin feature)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "totalFee" NUMERIC DEFAULT 0;
