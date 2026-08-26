ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_permissions text[];

COMMENT ON COLUMN public.profiles.admin_permissions IS
'Danh sách chỉ mục quản trị được phép truy cập. NULL/empty means dashboard only for non-admin staff.';

