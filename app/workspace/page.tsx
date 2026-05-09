import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const menu = readFirst(params.menu);

  if (menu === 'quiz') {
    redirect('/exercise');
  }

  if (menu === 'roundtable') {
    redirect('/roundtable');
  }

  if (menu === 'openmaic') {
    redirect('/openmaic');
  }

  redirect('/');
}
