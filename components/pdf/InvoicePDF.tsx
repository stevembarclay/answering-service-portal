import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { BillingInvoice } from '@/types/answeringService'

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const INK = '#0F172A'
const MUTED = '#64748B'
const RULE = '#E2E8F0'
const PRIMARY = '#2563EB'

const s = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    fontSize: 10,
    color: INK,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: INK,
  },
  brandSub: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  invoiceLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: INK,
    textAlign: 'right',
  },
  invoiceMeta: {
    fontSize: 9,
    color: MUTED,
    textAlign: 'right',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: INK,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: RULE,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 10,
    color: MUTED,
  },
  rowValue: {
    fontSize: 10,
    color: INK,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  lineItemName: {
    fontSize: 10,
    color: INK,
    flex: 1,
  },
  lineItemDesc: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  lineItemAmount: {
    fontSize: 10,
    color: INK,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: INK,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
  },
})

interface InvoicePDFProps {
  invoice: BillingInvoice
  businessName: string
}

export function InvoicePDF({ invoice, businessName }: InvoicePDFProps) {
  const isPaid = invoice.status === 'paid'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{businessName}</Text>
            <Text style={s.brandSub}>Answering Service</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceMeta}>
              {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </Text>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: isPaid ? '#DCFCE7' : '#FEF9C3', alignSelf: 'flex-end', marginTop: 6 },
              ]}
            >
              <Text style={[s.statusText, { color: isPaid ? '#15803D' : '#854D0E' }]}>
                {isPaid ? 'PAID' : invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Invoice details */}
        <View style={s.section}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Invoice created</Text>
            <Text style={s.rowValue}>{formatDate(invoice.createdAt)}</Text>
          </View>
          {invoice.paidAt ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Paid on</Text>
              <Text style={s.rowValue}>{formatDate(invoice.paidAt)}</Text>
            </View>
          ) : null}
          <View style={s.row}>
            <Text style={s.rowLabel}>Total calls</Text>
            <Text style={s.rowValue}>{invoice.callCount}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Line Items</Text>
          {invoice.lineItems.map((item) => (
            <View key={item.ruleId} style={s.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.lineItemName}>{item.ruleName}</Text>
                {item.unitDescription ? (
                  <Text style={s.lineItemDesc}>{item.unitDescription}</Text>
                ) : null}
              </View>
              <Text style={s.lineItemAmount}>{formatMoney(item.subtotalCents)}</Text>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>{formatMoney(invoice.totalCents)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Thank you for your business. Questions? Contact your answering service operator.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
