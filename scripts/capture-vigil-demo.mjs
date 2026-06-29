import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const totalFrames = 14
const baseUrl = process.argv[2] || 'http://localhost:3002/vigil-demo'
const outputDir = path.resolve(process.argv[3] || '../vigil-demo-frames')

let chromium

try {
  const playwright = await import('playwright')
  chromium = playwright.chromium
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright')
  process.exit(1)
}

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})

for (let frame = 0; frame < totalFrames; frame += 1) {
  const url = new URL(baseUrl)
  url.searchParams.set('export', 'frames')
  url.searchParams.set('frame', String(frame))

  await page.goto(url.toString(), { waitUntil: 'networkidle' })
  await page.screenshot({
    path: path.join(outputDir, `vigil-demo-frame-${String(frame + 1).padStart(2, '0')}.png`),
    fullPage: false,
  })
}

await browser.close()

console.log(`Captured ${totalFrames} frames to ${outputDir}`)
