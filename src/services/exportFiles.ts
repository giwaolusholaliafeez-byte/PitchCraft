import type { DesignedSlide } from '../domain/ai'
import { exportPitchMarkdown, generateSlides, type PitchInput } from '../domain/pitch'

type PdfDocument = InstanceType<typeof import('jspdf').jsPDF>

const safeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pitchcraft-export'

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const downloadPitchMarkdown = (pitch: PitchInput) => {
  downloadBlob(
    exportPitchMarkdown(pitch),
    `${safeFileName(pitch.projectName)}-pitch.md`,
    'text/markdown;charset=utf-8',
  )
}

const addWrappedText = (doc: PdfDocument, text: string, x: number, y: number, maxWidth: number): number => {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  doc.text(lines, x, y)
  return y + lines.length * 6 + 4
}

const ensurePageSpace = (doc: PdfDocument, y: number, neededSpace = 28): number => {
  if (y + neededSpace < 280) {
    return y
  }

  doc.addPage()
  return 22
}

const addSection = (doc: PdfDocument, title: string, body: string | string[], y: number): number => {
  const content = Array.isArray(body) ? body.filter(Boolean).map((item) => `• ${item}`).join('\n') : body
  let nextY = ensurePageSpace(doc, y, 34)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 18, nextY)
  nextY += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  return addWrappedText(doc, content || 'Not provided yet.', 18, nextY, 174)
}

export const downloadPitchPdf = async (pitch: PitchInput, designedSlides: DesignedSlide[] = []) => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 22

  doc.setFillColor(37, 99, 235)
  doc.roundedRect(18, y, 174, 28, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(pitch.projectName || 'Untitled Project', 26, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(pitch.tagline || 'PitchCraft export', 26, y + 21)
  y += 44

  y = addSection(doc, 'Problem', pitch.problem, y)
  y = addSection(doc, 'Intended Audience', pitch.audience, y)
  y = addSection(doc, 'Solution', pitch.solution, y)
  y = addSection(doc, 'Main Features', pitch.features, y)
  y = addSection(doc, 'Technology Stack', pitch.techStack, y)
  y = addSection(doc, 'Impact', pitch.impact, y)
  y = addSection(doc, 'Presentation Plan', pitch.demoPlan, y)
  y = addSection(doc, 'Next Steps', pitch.nextSteps, y)

  doc.addPage()
  y = 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Presentation Outline', 18, y)
  y += 14

  generateSlides(pitch).forEach((slide, index) => {
    y = ensurePageSpace(doc, y, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235)
    doc.text(`Slide ${index + 1}: ${slide.title}`, 18, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    y = addWrappedText(doc, slide.bullets.map((bullet) => `• ${bullet}`).join('\n'), 22, y, 170)
  })

  if (designedSlides.length > 0) {
    doc.addPage()
    y = 22
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text('AI Slide Design Directions', 18, y)
    y += 14

    designedSlides.forEach((slide, index) => {
      y = ensurePageSpace(doc, y, 54)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(37, 99, 235)
      doc.text(`Slide ${index + 1}: ${slide.title}`, 18, y)
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(71, 85, 105)
      y = addWrappedText(doc, `Layout: ${slide.layout}`, 22, y, 170)
      y = addWrappedText(doc, `Design: ${slide.visualDirection}`, 22, y, 170)
      y = addWrappedText(doc, `Speaker note: ${slide.speakerNote}`, 22, y, 170)
    })
  }

  doc.save(`${safeFileName(pitch.projectName)}-pitch.pdf`)
}
