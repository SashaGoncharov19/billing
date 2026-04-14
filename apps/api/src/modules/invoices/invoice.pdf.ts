import puppeteer from 'puppeteer'
import { S3Client } from 'bun'

const s3 = new S3Client({
  bucket: process.env.STORAGE_BUCKET || 'entity-billing',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || 'dummy',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || 'dummy',
  endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
})

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export async function uploadInvoicePdf(
  tenantId: string,
  invoiceId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const key = `invoices/${tenantId}/${invoiceId}.pdf`
  try {
    await s3.write(key, pdfBuffer, {
      type: 'application/pdf',
    })
    return key
  } catch (error) {
    console.error('Failed to upload PDF:', error)
    throw error
  }
}

export async function deleteInvoicePdf(tenantId: string, invoiceId: string): Promise<void> {
  const key = `invoices/${tenantId}/${invoiceId}.pdf`
  try {
    const exists = await s3.exists(key)
    if (exists) {
      await s3.delete(key)
    }
  } catch (error) {
    console.error('Failed to delete PDF:', error)
  }
}

export function getInvoiceSignedUrl(key: string, expiresIn = 3600): string {
  const url = s3.presign(key, { expiresIn })
  return url.toString()
}
