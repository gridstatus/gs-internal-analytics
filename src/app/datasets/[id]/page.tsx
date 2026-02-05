'use client';

import { useParams } from 'next/navigation';
import { DatasetDetailView } from '@/components/DatasetDetailView';

export default function DatasetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  if (!id) {
    return null;
  }

  return <DatasetDetailView datasetId={id} />;
}
