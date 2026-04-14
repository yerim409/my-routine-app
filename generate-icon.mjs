import sharp from 'sharp'

const sizes = [192, 512, 180] // 180 = iOS apple-touch-icon

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#34d399"/>
  <!-- 체크마크 -->
  <polyline points="120,270 210,370 390,160" stroke="white" stroke-width="60" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`)
  console.log(`생성: icon-${size}.png`)
}
