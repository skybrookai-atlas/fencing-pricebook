'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Supplier {
  id: string
  name: string
}

interface UploadFormProps {
  suppliers: Supplier[]
}

export function UploadForm({ suppliers }: UploadFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [supplierId, setSupplierId] = useState<string>('new')
  const [supplierName, setSupplierName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function handleFileChange(f: File | null) {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setError('Only CSV and Excel files (.csv, .xlsx, .xls) are supported.')
      return
    }
    setFile(f)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    if (supplierId === 'new' && !supplierName.trim()) {
      setError('Please enter a supplier name.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    if (supplierId !== 'new') {
      formData.append('supplier_id', supplierId)
    } else {
      formData.append('supplier_name', supplierName.trim())
    }

    const res = await fetch('/api/import', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Import failed.')
      setLoading(false)
      return
    }

    router.push(`/import/${data.import_id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Supplier selection */}
      <div className="space-y-2">
        <Label>Supplier</Label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger>
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">+ New supplier</SelectItem>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {supplierId === 'new' && (
          <Input
            placeholder="Supplier name"
            value={supplierName}
            onChange={e => setSupplierName(e.target.value)}
            autoFocus
          />
        )}
      </div>

      {/* File drop zone */}
      <div className="space-y-2">
        <Label>Price list file</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            handleFileChange(e.dataTransfer.files[0] ?? null)
          }}
        >
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(0)} KB — click to change
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600">Drop a CSV or Excel file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading || !file}>
        {loading ? 'Processing…' : 'Import price list'}
      </Button>
    </form>
  )
}
