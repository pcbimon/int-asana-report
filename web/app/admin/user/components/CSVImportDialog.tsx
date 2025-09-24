'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CSVData {
  headers: string[]
  rows: Record<string, string>[]
}

interface ColumnMapping {
  email: string
  firstname: string
  lastname: string
  nickname: string
  deptid: string
}

interface CSVImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: { email: string; firstname?: string; lastname?: string; nickname?: string; deptid?: string }[]) => Promise<void>
}

const REQUIRED_FIELDS = ['email']
const OPTIONAL_FIELDS = ['firstname', 'lastname', 'nickname', 'deptid']
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export function CSVImportDialog({
  isOpen,
  onClose,
  onImport,
}: CSVImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetDialog = useCallback(() => {
    setStep('upload')
    setCsvData(null)
    setColumnMapping({})
    setError('')
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setError('')
    setIsProcessing(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`)
          setIsProcessing(false)
          return
        }

        const data = results.data as Record<string, string>[]
        if (data.length === 0) {
          setError('CSV file is empty')
          setIsProcessing(false)
          return
        }

        const headers = Object.keys(data[0])
        setCsvData({ headers, rows: data })
        
        // Auto-map columns if possible
        const autoMapping: Partial<ColumnMapping> = {}
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase().trim()
          if (lowerHeader.includes('email') || lowerHeader === 'email') {
            autoMapping.email = header
          } else if (lowerHeader.includes('first') || lowerHeader === 'firstname') {
            autoMapping.firstname = header
          } else if (lowerHeader.includes('last') || lowerHeader === 'lastname') {
            autoMapping.lastname = header
          } else if (lowerHeader.includes('nick') || lowerHeader === 'nickname') {
            autoMapping.nickname = header
          } else if (lowerHeader.includes('dept') || lowerHeader === 'department' || lowerHeader === 'deptid') {
            autoMapping.deptid = header
          }
        })
        
        setColumnMapping(autoMapping)
        setStep('mapping')
        setIsProcessing(false)
      },
      error: (error) => {
        setError(`File reading error: ${error.message}`)
        setIsProcessing(false)
      }
    })
  }, [])

  const handleMappingNext = useCallback(() => {
    if (!csvData || !columnMapping.email) {
      setError('Email column mapping is required')
      return
    }
    setError('')
    setStep('preview')
  }, [csvData, columnMapping])

  const handleImport = useCallback(async () => {
    if (!csvData || !columnMapping.email) return

    setIsProcessing(true)
    setError('')

    try {
      const mappedData = csvData.rows.map(row => {
        const mappedRow: { email: string; firstname?: string; lastname?: string; nickname?: string; deptid?: string } = {
          email: row[columnMapping.email!]?.trim() || '',
        }
        
        if (columnMapping.firstname && row[columnMapping.firstname]) {
          mappedRow.firstname = row[columnMapping.firstname].trim()
        }
        if (columnMapping.lastname && row[columnMapping.lastname]) {
          mappedRow.lastname = row[columnMapping.lastname].trim()
        }
        if (columnMapping.nickname && row[columnMapping.nickname]) {
          mappedRow.nickname = row[columnMapping.nickname].trim()
        }
        if (columnMapping.deptid && row[columnMapping.deptid]) {
          mappedRow.deptid = row[columnMapping.deptid].trim()
        }

        return mappedRow
      }).filter(row => row.email) // Filter out rows without email

      await onImport(mappedData)
      resetDialog()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsProcessing(false)
    }
  }, [csvData, columnMapping, onImport, resetDialog, onClose])

  const handleClose = useCallback(() => {
    resetDialog()
    onClose()
  }, [resetDialog, onClose])

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Upload a CSV file to import users. The CSV should include an email column and optionally firstname, lastname, nickname, and department columns.
        </p>
        
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Select a CSV file to continue
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  )

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>Map CSV columns to user fields. Required fields are marked with *</p>
        <p className="mt-1">Found {csvData?.rows.length} rows in your CSV file.</p>
      </div>

      <div className="space-y-3">
        {ALL_FIELDS.map((field) => {
          const isRequired = REQUIRED_FIELDS.includes(field)
          const fieldLabels = {
            email: 'Email',
            firstname: 'First Name',
            lastname: 'Last Name', 
            nickname: 'Nickname',
            deptid: 'Department ID'
          }
          
          return (
            <div key={field} className="flex items-center gap-4">
              <Label className="w-24 text-sm">
                {fieldLabels[field as keyof typeof fieldLabels]}
                {isRequired && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={columnMapping[field as keyof ColumnMapping] || '__none'}
                onValueChange={(value) => {
                  setColumnMapping(prev => ({
                    ...prev,
                    [field]: value === '__none' ? undefined : value
                  }))
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Select ${fieldLabels[field as keyof typeof fieldLabels]} column`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">-- Not mapped --</SelectItem>
                  {csvData?.headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  )

  const renderPreviewStep = () => {
    const previewData = csvData?.rows.slice(0, 5) || []
    
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Preview of the first {previewData.length} rows that will be imported:</p>
          <p className="mt-1">Total rows to import: {csvData?.rows.filter(row => row[columnMapping.email!]?.trim()).length}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">First Name</th>
                    <th className="text-left p-2">Last Name</th>
                    <th className="text-left p-2">Nickname</th>
                    <th className="text-left p-2">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-2 font-medium">
                        {row[columnMapping.email!] || <Badge variant="destructive">Missing</Badge>}
                      </td>
                      <td className="p-2">{columnMapping.firstname ? row[columnMapping.firstname] : '-'}</td>
                      <td className="p-2">{columnMapping.lastname ? row[columnMapping.lastname] : '-'}</td>
                      <td className="p-2">{columnMapping.nickname ? row[columnMapping.nickname] : '-'}</td>
                      <td className="p-2">{columnMapping.deptid ? row[columnMapping.deptid] : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    )
  }

  const getStepTitle = () => {
    switch (step) {
      case 'upload': return 'Upload CSV File'
      case 'mapping': return 'Map Columns'
      case 'preview': return 'Preview & Import'
      default: return 'Import Users'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'preview' && renderPreviewStep()}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {step !== 'upload' && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                  disabled={isProcessing}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              
              {step === 'upload' && (
                <Button disabled>
                  Next
                </Button>
              )}
              
              {step === 'mapping' && (
                <Button
                  onClick={handleMappingNext}
                  disabled={!columnMapping.email}
                >
                  Preview
                </Button>
              )}
              
              {step === 'preview' && (
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Importing...' : 'Import Users'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}