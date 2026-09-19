// This component is only imported by invoiceService.ts (server-side).
// Do NOT import in any React Server Component or Client Component.

import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { BillingLineItem } from '@/types/answeringService'

export interface InvoicePdfProps {
  invoiceId: string
  operatorName: string
  operatorLogoUrl?: string
  businessName: string
  periodStart: string      // formatted, e.g. "March 1, 2026"
  periodEnd: string
  lineItems: BillingLineItem[]
  totalCents: number
  generatedAt: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 48,
    color: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    maxHeight: 48,
    maxWidth: 120,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 20,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  colLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  colValue: {
    fontSize: 11,
    color: '#0f172a',
  },
  periodLabel: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  colRule: { flex: 3 },
  colUnits: { flex: 4, paddingHorizontal: 8 },
  colAmount: { flex: 2, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  totalLabel: {
    flex: 7,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  totalAmount: {
    flex: 2,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  footer: {
    marginTop: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

export function InvoicePdfDocument({
  invoiceId,
  operatorName,
  operatorLogoUrl,
  businessName,
  periodStart,
  periodEnd,
  lineItems,
  totalCents,
  generatedAt,
}: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header row */}
        <View style={styles.headerRow}>
          {operatorLogoUrl ? (
            <Image src={operatorLogoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.logoPlaceholder}>{operatorName}</Text>
          )}
          <Text style={styles.invoiceTitle}>INVOICE</Text>
        </View>

        <View style={styles.separator} />

        {/* From / Bill To */}
        <View style={styles.twoCol}>
          <View>
            <Text style={styles.colLabel}>From</Text>
            <Text style={styles.colValue}>{operatorName}</Text>
          </View>
          <View>
            <Text style={styles.colLabel}>Bill To</Text>
            <Text style={styles.colValue}>{businessName}</Text>
          </View>
        </View>

        <Text style={styles.periodLabel}>
          Service period: {periodStart} – {periodEnd}
        </Text>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colRule]}>Rule</Text>
          <Text style={[styles.tableHeaderCell, styles.colUnits]}>Units</Text>
          <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
        </View>

        {lineItems.map((item) => (
          <View key={item.ruleId} style={styles.tableRow}>
            <Text style={[{ fontSize: 10, color: '#1e293b' }, styles.colRule]}>{item.ruleName}</Text>
            <Text style={[{ fontSize: 10, color: '#475569' }, styles.colUnits]}>{item.unitDescription}</Text>
            <Text style={[{ fontSize: 10, color: '#1e293b' }, styles.colAmount]}>
              {formatCents(item.subtotalCents)}
            </Text>
          </View>
        ))}

        <View style={styles.separator} />

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCents(totalCents)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Invoice ID: {invoiceId} · Generated {generatedAt}
        </Text>
      </Page>
    </Document>
  )
}
