'use client';

import { Anchor, Group } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

const STRIPE_ACCOUNT_ID = 'acct_1NgByuIbBM8fkFtY';

interface StripeSubscriptionIdProps {
  id: string | null;
}

export function StripeSubscriptionId({ id }: StripeSubscriptionIdProps) {
  if (!id) return <>—</>;

  const href = `https://dashboard.stripe.com/${STRIPE_ACCOUNT_ID}/subscriptions/${id}`;

  return (
    <Anchor href={href} target="_blank" rel="noopener noreferrer" size="sm">
      <Group gap={4} wrap="nowrap" display="inline-flex">
        {id}
        <IconExternalLink size={14} />
      </Group>
    </Anchor>
  );
}
