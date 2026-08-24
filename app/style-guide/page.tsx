'use client'

import { useState } from 'react'
import {
  Calendar,
  CalendarCheck,
  Lock,
  Palette,
  Swords,
  Trophy,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconTile from '@/components/ui/IconTile'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'

const statusColors = ['approved', 'pending', 'rejected', 'info', 'neutral', 'accent'] as const
const badgeTones = ['approved', 'pending', 'rejected', 'info', 'neutral', 'accent'] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral">{title}</h2>
      {children}
    </section>
  )
}

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [segmentValue, setSegmentValue] = useState('upcoming')
  const [statusValue, setStatusValue] = useState('pending')

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          icon={Palette}
          title="Sprint 8 Style Guide"
          subtitle="Temporary visual review page — delete after Sprint 8"
        />

        <Section title="Badge">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {badgeTones.map(tone => (
                <Badge key={`solid-${tone}`} tone={tone} variant="solid">
                  {tone}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {badgeTones.map(tone => (
                <Badge key={`tint-${tone}`} tone={tone} variant="tint">
                  {tone}
                </Badge>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="approved">Approved</Button>
            <Button variant="rejected">Rejected</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </Section>

        <Section title="Card">
          <div className="space-y-3">
            {statusColors.map(color => (
              <Card key={color} statusColor={color} className="p-4">
                <p className="text-sm font-semibold text-ink capitalize">{color}</p>
                <p className="text-xs text-neutral">Sample card with {color} left border</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="SegmentedControl">
          <div className="space-y-4">
            <SegmentedControl
              options={[
                { label: 'Upcoming', value: 'upcoming' },
                { label: 'Past', value: 'past' },
                { label: 'All Dates', value: 'all' },
              ]}
              value={segmentValue}
              onChange={setSegmentValue}
            />
            <SegmentedControl
              options={[
                { label: 'Pending', value: 'pending', tone: 'pending' },
                { label: 'Approved', value: 'approved', tone: 'approved' },
                { label: 'Rejected', value: 'rejected', tone: 'rejected' },
              ]}
              value={statusValue}
              onChange={setStatusValue}
            />
          </div>
        </Section>

        <Section title="IconTile">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
            <IconTile icon={Calendar} label="Calendar" href="/planner" tone="approved" />
            <IconTile icon={CalendarCheck} label="My Bookings" href="/my-bookings" tone="accent" />
            <IconTile icon={Swords} label="Fixtures" href="/fixtures" tone="info" />
            <IconTile icon={Trophy} label="Results" href="/results" tone="pending" />
          </div>
        </Section>

        <Section title="EmptyState">
          <EmptyState
            icon={Lock}
            title="No closures added"
            message="Add a pitch closure to block bookings during maintenance."
          />
        </Section>

        <Section title="Modal">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open test modal
          </Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Test Modal">
            <p className="mb-4 text-sm text-neutral">
              White rounded-xl card over a dark overlay, 24px padding, X to close.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </Modal>
        </Section>
      </div>
    </div>
  )
}
