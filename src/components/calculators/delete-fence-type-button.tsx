'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  fenceTypeId: string
  fenceTypeName: string
}

export function DeleteFenceTypeButton({ fenceTypeId, fenceTypeName }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${fenceTypeName}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/fence-types/${fenceTypeId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Delete failed — please try again.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-1 text-sm transition-colors"
      style={{ color: '#9E9E9E' }}
      onMouseEnter={e => { if (!deleting) (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9E9E9E' }}
    >
      <Trash2 size={14} />
      {deleting ? 'Deleting…' : 'Delete'}
    </button>
  )
}
