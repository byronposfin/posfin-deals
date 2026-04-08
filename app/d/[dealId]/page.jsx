'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Scorecard from '@/components/Scorecard';
import ProgressBar from '@/components/ProgressBar';
import TaskList from '@/components/TaskList';

const POLL_MS = 20000;
const WHATSAPP_NUMBER = '447000000000'; // TODO: replace with Posfin WhatsApp number

export default function DealPage() {
  const { dealId } = useParams();
  const sp = useSearchParams();
  const token = sp.get('t');
  const printMode = sp.get('print') === '1';

  const [deal, setDeal] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [changedFields, setChangedFields] = useState(new Set());
  const prevRef = useRef(null);

  async function load() {
    try {
      const res = await fetch(`/api/deal/${dealId}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (!res.ok) { setError(`Access denied (${res.status})`); return; }
      const data = await res.json();
      const newDeal = data.deal;

      // Diff against previous to drive the pulse animation
      if (prevRef.current) {
        const changed = new Set();
        for (const k of Object.keys(newDeal)) {
          if (JSON.stringify(prevRef.current[k]) !== JSON.stringify(newDeal[k])) changed.add(k);
        }
        setChangedFields(changed);
        if (changed.size) setTimeout(() => setChangedFields(new Set()), 1500);
      }
      prevRef.current = newDeal;
      setDeal(newDeal);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError('Connection error');
    }
  }

  useEffect(() => {
    if (!token) { setError('Missing access token'); return; }
    load();
    if (printMode) return; // no polling when rendering for PDF
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, token]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-posfin-navy">Access problem</h1>
          <p className="mt-2 text-posfin-navy/70">{error}</p>
          <p className="mt-4 text-sm text-posfin-navy/50">Please message Posfin on WhatsApp for a new link.</p>
        </div>
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-posfin-navy/60">Loading your deal…</div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-4 pb-16">
      <Scorecard deal={deal} changedFields={changedFields} />

      {!printMode && (
        <>
          <section className="mt-6 bg-white rounded-2xl shadow-sm border border-posfin-navy/10 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-posfin-navy/70 mb-1">Progress</h2>
            <ProgressBar stage={deal.stage} />
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-posfin-navy/70 mb-3 px-1">Your tasks</h2>
            <TaskList tasks={deal.tasks || []} />
          </section>

          <section className="mt-6">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Posfin, about deal ${deal.deal_id}:`)}`}
              className="block w-full text-center bg-posfin-teal text-white font-bold py-4 rounded-2xl shadow-sm"
            >
              Message Posfin on WhatsApp
            </a>
          </section>

          <div className="mt-6 text-center text-[11px] text-posfin-navy/40">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB')}` : 'Live'} · Posfin Capital Ltd · FRN 913022
          </div>
        </>
      )}

      {printMode && (
        <div className="mt-6 text-center text-[10px] text-posfin-navy/40">
          Posfin Capital Ltd · FRN 913022 · 96 Kensington High Street, London W8 4SG
        </div>
      )}
    </main>
  );
}
