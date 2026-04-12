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

export async function uploadInvoicePdf(tenantId: string, invoiceId: string, pdfBuffer: Buffer): Promise<string> {
  const key = `invoices/${tenantId}/${invoiceId}.pdf`
  
  // Note: Bun S3 write doesn't natively expose an S3Client that writes directly 
  // with write() if it's the web standard S3Client, but the `s3.write(key, data)` works in Bun 1.2+
  // and natively handles multipart uploads.
  try {
    // In Bun, passing the buffer into write works directly.
    await s3.write(key, pdfBuffer, {
      type: 'application/pdf',
    })
    return key
  } catch (error) {
    console.error('Failed to upload PDF:', error)
    throw error
  }
}

export function getInvoiceSignedUrl(key: string, expiresIn = 3600): string {
  // Bun.S3 presign natively
  const url = s3.presign(key, { expiresIn })
  return url.toString()
}
