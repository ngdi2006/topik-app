import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CampusHub from '@/components/campus/CampusHub'
import { getTrustedUserRole } from '@/lib/admin-role'

export const metadata = { title: 'Trung tâm 3D · TOPIK', description: 'Nhập vai đi học và làm quen phòng thi.' }

export default async function CampusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/campus')
  if (await getTrustedUserRole(user, supabase) !== 'admin') redirect('/dashboard')
  return <CampusHub />
}
