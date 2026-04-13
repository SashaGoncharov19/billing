import { X, Download, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PdfViewerModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrlFn: () => Promise<string>
  title?: string
}

export default function PdfViewerModal({ isOpen, onClose, pdfUrlFn, title = "Invoice Document" }: PdfViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    if (isOpen) {
      setLoading(true)
      setError(false)
      pdfUrlFn()
        .then(u => {
          if (mounted) setUrl(u)
        })
        .catch(() => {
          if (mounted) setError(true)
        })
        .finally(() => {
          if (mounted) setLoading(false)
        })
    } else {
      setUrl(null) // cleanup
      setLoading(false)
    }
    
    return () => {
      mounted = false
    }
  }, [isOpen])

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col border overflow-hidden">
        
        <div className="h-16 px-6 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText size={20} />
            </div>
            <h2 className="font-semibold text-lg">{title}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {url && (
              <a 
                href={url} 
                download 
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Download size={16} />
                Download PDF
              </a>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-muted/10 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 z-10">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="font-medium">Loading secure document...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
              <p className="font-medium">Failed to load document.</p>
              <button onClick={() => onClose()} className="mt-4 px-4 py-2 border rounded-md text-foreground">Close</button>
            </div>
          )}
          {url && (
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} 
              className="w-full h-full border-0"
              title={title}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
