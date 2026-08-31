import TextbookReader from "@/components/textbooks/TextbookReader"

export default async function TextbookReadPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ bookId }, query] = await Promise.all([params, searchParams])
  const initialPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)
  return <TextbookReader bookId={bookId} initialPage={initialPage} />
}
