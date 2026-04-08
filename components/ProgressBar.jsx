'use client';
const STAGES = ['application', 'offer', 'legal', 'completion'];
const LABELS = { application: 'Application', offer: 'Offer', legal: 'Legal', completion: 'Completion' };

export default function ProgressBar({ stage }) {
  const idx = STAGES.indexOf(stage || 'application');
  return (
    <div className="px-1 py-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-posfin-navy/10 rounded-full -translate-y-1/2" />
        <div
          className="absolute left-0 top-1/2 h-1 bg-posfin-teal rounded-full -translate-y-1/2 transition-all duration-700"
          style={{ width: `${(idx / (STAGES.length - 1)) * 100}%` }}
        />
        {STAGES.map((s, i) => {
          const done = i <= idx;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <div className={[
                'w-5 h-5 rounded-full border-2 transition',
                done ? 'bg-posfin-teal border-posfin-teal' : 'bg-white border-posfin-navy/20',
                i === idx ? 'ring-4 ring-posfin-teal/20 animate-pulse' : '',
              ].join(' ')} />
              <div className={['mt-2 text-[10px] font-semibold uppercase tracking-wide', done ? 'text-posfin-navy' : 'text-posfin-navy/40'].join(' ')}>
                {LABELS[s]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
