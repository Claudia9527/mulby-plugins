export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'docx'

export interface ExportSource {
  markdown: string
  html: string
  documentName: string
}

export interface ExportDocument extends ExportSource {
  fullHtml: string
}

export interface ExportFilesystem {
  writeFile: (path: string, data: string | ArrayBuffer, encoding?: 'utf-8' | 'base64') => Promise<void>
}
