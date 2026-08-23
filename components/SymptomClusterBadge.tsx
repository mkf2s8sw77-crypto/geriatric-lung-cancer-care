import { CLUSTER_LABEL, CLUSTER_COLOR, type SymptomCluster } from '../lib/services/symptom-cluster';

export default function SymptomClusterBadge({ cluster, size = 'sm' }: { cluster: SymptomCluster | null; size?: 'sm' | 'xs' }) {
  if (!cluster) return null;
  const c = CLUSTER_COLOR[cluster];
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-block rounded-full border ${padding} ${c.bg} ${c.text} ${c.border}`}>
      {CLUSTER_LABEL[cluster]}
    </span>
  );
}
