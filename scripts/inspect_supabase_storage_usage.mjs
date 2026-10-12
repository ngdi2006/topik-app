import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Thiếu cấu hình Supabase')
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function inspectFolder(bucketId, path = '') {
  let offset = 0
  let bytes = 0
  let files = 0
  const folders = []
  while (true) {
    const { data, error } = await supabase.storage.from(bucketId).list(path, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    for (const item of data || []) {
      if (item.metadata && typeof item.metadata.size !== 'undefined') {
        files += 1
        bytes += Number(item.metadata.size) || 0
      } else {
        folders.push(path ? `${path}/${item.name}` : item.name)
      }
    }
    if (!data || data.length < 1000) break
    offset += data.length
  }
  for (const folder of folders) {
    const nested = await inspectFolder(bucketId, folder)
    files += nested.files
    bytes += nested.bytes
  }
  return { files, bytes }
}

const { data: buckets, error } = await supabase.storage.listBuckets()
if (error) throw error
const results = []
for (const bucket of buckets || []) {
  const usage = await inspectFolder(bucket.id)
  results.push({ id: bucket.id, public: bucket.public, ...usage })
}
console.log(JSON.stringify({ buckets: results, totalBytes: results.reduce((sum, bucket) => sum + bucket.bytes, 0), totalFiles: results.reduce((sum, bucket) => sum + bucket.files, 0) }, null, 2))
