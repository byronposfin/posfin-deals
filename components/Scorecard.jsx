'use client';
import { useEffect, useRef } from 'react';

const STAGES = [
  { id: 'application', label: 'Application' },
  { id: 'offer',       label: 'Offer' },
  { id: 'legal',       label: 'Legal' },
  { id: 'completion',  label: 'Completion' },
];

function fmtGBP(n) {
  if (!n) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function Field({ label, value, changed }) {
  const ref = useRef(null);
  useEffect(() => {
    if (changed && ref.current) {
      ref.current.classList.remove('field-pulse');
      void ref.current.offsetWidth;
      ref.current.classList.add('field-pulse');
    }
  }, [changed, value]);
  return (
    <div ref={ref} className="px-3 py-2 rounded-lg">
      <div className="text-xs uppercase tracking-wide text-posfin-navy/50">{label}</div>
      <div className="text-base font-semibold text-posfin-navy">{value ?? '—'}</div>
    </div>
  );
}

export default function Scorecard({ deal, changedFields = new Set() }) {
  if (!deal) return null;
  const currentIndex = STAGES.findIndex(s => s.id === (deal.stage || 'application'));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-posfin-navy/10 overflow-hidden">
      {/* Header strip */}
      <div className="bg-posfin-navy text-posfin-cream px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-posfin-teal">Posfin Capital</div>
          <div className="text-lg font-bold">{deal.borrower_name || 'Your Deal'}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-posfin-cream/60">Ref</div>
          <div className="font-mono text-sm">{deal.deal_id}</div>
        </div>
      </div>

      {/* Stage pills */}
      <div className="px-5 pt-5">
        <div className="flex gap-2">
          {STAGES.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div
                key={s.id}
                className={[
                  'flex-1 text-center text-xs font-semibold py-2 rounded-full transition',
                  active ? 'bg-posfin-teal text-white shadow' :
                  done   ? 'bg-posfin-teal/20 text-posfin-navy' :
                           'bg-posfin-navy/5 text-posfin-navy/50',
                ].join(' ')}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Property card */}
      <div className="px-5 pt-5">
        <div className="rounded-xl bg-posfin-cream/70 p-4">
          <div className="text-[11px] uppercase tracking-wider text-posfin-navy/50 mb-1">Property</div>
          <div className="font-semibold text-posfin-navy mb-3">{deal.property_address || '—'}</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Type" value={deal.property_type} changed={changedFields.has('property_type')} />
            <Field label="Value" value={fmtGBP(deal.property_value)} changed={changedFields.has('property_value')} />
            <Field label="LTV" value={deal.ltv ? `${deal.ltv}%` : '—'} changed={changedFields.has('loan_amount') || changedFields.has('property_value')} />
          </div>
        </div>
      </div>

      {/* Loan card */}
      <div className="px-5 pt-4">
        <div className="rounded-xl bg-posfin-cream/70 p-4">
          <div className="text-[11px] uppercase tracking-wider text-posfin-navy/50 mb-1">Loan</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Amount" value={fmtGBP(deal.loan_amount)} changed={changedFields.has('loan_amount')} />
            <Field label="Term" value={deal.loan_term_months ? `${deal.loan_term_months} mo` : '—'} changed={changedFields.has('loan_term_months')} />
            <Field label="Rate" value={deal.rate_indication} changed={changedFields.has('rate_indication')} />
          </div>
          <div className="mt-3">
            <Field label="Purpose" value={deal.loan_purpose} changed={changedFields.has('loan_purpose')} />
          </div>
        </div>
      </div>

      {/* Next action */}
      <div className="px-5 pt-4 pb-5">
        <div className="rounded-xl border border-posfin-teal/40 bg-posfin-teal/5 p-4">
          <div className="text-[11px] uppercase tracking-wider text-posfin-teal font-bold mb-1">Next step</div>
          <div className="text-posfin-navy font-semibold">{deal.next_action || 'Posfin is reviewing your application.'}</div>
          {deal.next_action_owner && (
            <div className="text-xs text-posfin-navy/60 mt-1">
              Owner: {deal.next_action_owner === 'borrower' ? 'You' : 'Posfin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
