'use client';

const URGENCY = {
  urgent:   { label: 'Urgent today',  dot: 'bg-red-500',    ring: 'border-red-200 bg-red-50' },
  business: { label: 'Business hours', dot: 'bg-blue-500',   ring: 'border-blue-200 bg-blue-50' },
  anytime:  { label: 'Anytime',        dot: 'bg-emerald-500',ring: 'border-emerald-200 bg-emerald-50' },
};

export default function TaskList({ tasks = [] }) {
  const groups = { urgent: [], business: [], anytime: [] };
  tasks.forEach(t => { (groups[t.urgency] || groups.anytime).push(t); });

  return (
    <div className="space-y-4">
      {['urgent', 'business', 'anytime'].map(key => {
        const list = groups[key];
        if (!list.length) return null;
        const u = URGENCY[key];
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`w-2 h-2 rounded-full ${u.dot}`} />
              <span className="text-xs font-bold uppercase tracking-wide text-posfin-navy/70">{u.label}</span>
              <span className="text-xs text-posfin-navy/40">({list.length})</span>
            </div>
            <div className="space-y-2">
              {list.map((t, i) => (
                <div key={i} className={`rounded-xl border p-3 ${u.ring}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-posfin-navy">{t.title}</div>
                      {t.description && <div className="text-sm text-posfin-navy/60 mt-0.5">{t.description}</div>}
                      {typeof t.percent === 'number' && (
                        <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-posfin-teal" style={{ width: `${t.percent}%` }} />
                        </div>
                      )}
                    </div>
                    {t.action_label && (
                      <button className="px-3 py-2 bg-posfin-navy text-white text-xs font-bold rounded-lg min-w-[72px]">
                        {t.action_label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
