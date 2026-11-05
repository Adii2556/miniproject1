const escapePdfText = (text: string) => text.replace(/([\\()])/g, '\\$1')

/** Build a tiny, standards-compliant, text-only PDF for parser and browser tests. */
export function createTestPdf(pageTexts: string[]): Uint8Array {
  const objects = new Map<number, string>()
  const pageNumbers = pageTexts.map((_, index) => 4 + index * 2)
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objects.set(2, `<< /Type /Pages /Kids [${pageNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${pageTexts.length} >>`)
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pageTexts.forEach((text, index) => {
    const pageNumber = pageNumbers[index]
    const contentNumber = pageNumber + 1
    const content = `BT /F1 12 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`
    objects.set(pageNumber, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>`)
    objects.set(contentNumber, `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`)
  })

  const maxObject = Math.max(...objects.keys())
  let pdf = '%PDF-1.4\n%âãÏÓ\n'
  const offsets = new Array<number>(maxObject + 1).fill(0)
  for (let number = 1; number <= maxObject; number++) {
    offsets[number] = Buffer.byteLength(pdf, 'latin1')
    pdf += `${number} 0 obj\n${objects.get(number)}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`
  for (let number = 1; number <= maxObject; number++) pdf += `${String(offsets[number]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return new Uint8Array(Buffer.from(pdf, 'latin1'))
}
