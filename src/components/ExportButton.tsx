'use client';

import { RefObject, useState } from 'react';
import { Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ChartRef {
  name: string;
  ref: RefObject<HTMLDivElement | null>;
}

interface ExportButtonProps {
  charts: ChartRef[];
}

export function ExportButton({ charts }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      const folder = zip.folder(`export_${today}`);

      if (!folder) {
        throw new Error('Failed to create zip folder');
      }

      for (const { name, ref } of charts) {
        if (ref.current) {
          const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
          const base64 = dataUrl.split(',')[1];
          folder.file(`${name}.png`, base64, { base64: true });
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `export_${today}.zip`);
    } catch (error) {
      console.error('Error exporting charts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      leftSection={<IconDownload size={16} />}
      onClick={handleExport}
      loading={loading}
      variant="outline"
    >
      Export All Charts
    </Button>
  );
}
