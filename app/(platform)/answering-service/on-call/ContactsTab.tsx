'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { OnCallContact } from '@/lib/services/answering-service/onCallService'

interface ContactsTabProps {
  businessId: string
  contacts: OnCallContact[]
  onContactsChange: (contacts: OnCallContact[]) => void
}

interface ContactForm {
  id?: string
  name: string
  phone: string
  role: string
  notes: string
}

const emptyForm: ContactForm = { name: '', phone: '', role: '', notes: '' }

export function ContactsTab({ businessId, contacts, onContactsChange }: ContactsTabProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState<ContactForm | null>(null)
  const [saving, setSaving] = useState(false)

  function startAdd() {
    setEditing({ ...emptyForm })
  }

  function startEdit(contact: OnCallContact) {
    setEditing({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      role: contact.role ?? '',
      notes: contact.notes ?? '',
    })
  }

  async function handleSave() {
    if (!editing || !editing.name.trim() || !editing.phone.trim()) {
      toast({ title: 'Name and phone are required.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = editing.id
        ? `/api/v1/internal/on-call/contacts/${editing.id}`
        : '/api/v1/internal/on-call/contacts'
      const method = editing.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: editing.name.trim(),
          phone: editing.phone.trim(),
          role: editing.role.trim() || null,
          notes: editing.notes.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save.')

      const { data } = await res.json()

      onContactsChange(
        editing.id
          ? contacts.map((c) => (c.id === editing.id ? data : c))
          : [...contacts, data]
      )
      setEditing(null)
      toast({ title: editing.id ? 'Contact updated.' : 'Contact added.' })
    } catch {
      toast({ title: 'Failed to save contact.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contactId: string) {
    try {
      const res = await fetch(`/api/v1/internal/on-call/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) throw new Error('Failed to remove contact.')
      onContactsChange(contacts.filter((c) => c.id !== contactId))
      if (editing?.id === contactId) setEditing(null)
      toast({ title: 'Contact removed.' })
    } catch {
      toast({ title: 'Failed to remove contact.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 && !editing && (
        <p className="text-sm text-slate-400">No contacts yet. Add one to get started.</p>
      )}

      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm"
        >
          <div className="min-w-0">
            <span className="font-medium">{contact.name}</span>
            {contact.role && <span className="text-slate-500 ml-2">· {contact.role}</span>}
            <p className="text-slate-400 text-xs mt-0.5">{contact.phone}</p>
            {contact.notes && <p className="text-slate-400 text-xs italic">{contact.notes}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button variant="outline" size="sm" onClick={() => startEdit(contact)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleDelete(contact.id)}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Dr. Sarah Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                placeholder="555-0100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                placeholder="Physician"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Text before calling"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing.id ? 'Update' : 'Add contact'}
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <Button variant="outline" className="w-full" onClick={startAdd}>
          + Add contact
        </Button>
      )}
    </div>
  )
}
