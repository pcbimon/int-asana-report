import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({ searchParams }: { searchParams: Promise<{ code: string }> }) {
  const params = await searchParams
  const code = params?.code?.toString()?.trim()

  function getErrorInfo(code?: string) {
    switch (code) {
      case '404':
        return {
          title: '404 — ไม่พบหน้า',
          message: 'หน้าที่คุณร้องขอไม่พบ โปรดตรวจสอบลิงก์หรือกลับไปยังหน้าเริ่มต้น.',
          suggestion: { text: 'กลับไปที่หน้าแรก', href: '/' },
        }
      case '403':
        return {
          title: '403 — ไม่มีสิทธิ์เข้าถึง',
          message: 'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้ หากต้องการเข้าถึง โปรดติดต่อผู้ดูแลระบบ.',
          suggestion: { text: 'ขอสิทธิ์ / ติดต่อผู้ดูแล', href: '/auth/login' },
        }
      case '500':
        return {
          title: '500 — ข้อผิดพลาดภายในเซิร์ฟเวอร์',
          message: 'เกิดข้อผิดพลาดภายใน ลองโหลดหน้าซ้ำอีกครั้ง หรือติดต่อผู้ดูแลระบบหากยังเกิดขึ้น.',
          suggestion: { text: 'ลองอีกครั้ง', href: '/' },
        }
      default:
        return {
          title: code ? `${code} — เกิดข้อผิดพลาด` : 'เกิดข้อผิดพลาด',
          message: code ? `รหัสข้อผิดพลาด: ${code}` : 'เกิดข้อผิดพลาดที่ไม่ระบุรายละเอียด',
          suggestion: { text: 'กลับไปยังหน้าเริ่มต้น', href: '/' },
        }
    }
  }

  const info = getErrorInfo(code)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{info.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{info.message}</p>
              <Link href={info.suggestion.href} className="text-sm font-medium text-primary underline">
                {info.suggestion.text}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
