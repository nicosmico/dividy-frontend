import { IconArrowNarrowRight } from '@tabler/icons-react';
import { PageContainer, RoundedButton } from 'src/components/ui';
import { MemberForm, MemberList } from 'src/features/split';
import useBreakpoint from 'src/hooks/useBreakpoint';
import { Member } from 'src/models/Member';

const members: Member[] = [
  {
    id: crypto.randomUUID(),
    name: 'Nico',
    email: 'nico@gmail.com',
    phone: '931220127',
  },
  { id: crypto.randomUUID(), name: 'Tamara' },
  { id: crypto.randomUUID(), name: 'Manuel' },
  { id: crypto.randomUUID(), name: 'Marcelo' },
  { id: crypto.randomUUID(), name: 'Jorge' },
  { id: crypto.randomUUID(), name: 'Jorge' },
  { id: crypto.randomUUID(), name: 'Jorge' },
  { id: crypto.randomUUID(), name: 'Jorge' },
  { id: crypto.randomUUID(), name: 'Jorge' },
];

export function Members() {
  const { md } = useBreakpoint();
  return (
    <PageContainer className='space-y-4'>
      <div className='space-y-4 md:flex md:gap-4'>
        <div className='w-full text-center md:text-left'>
          <h1 className='text-xl font-bold'>Miembros</h1>
          <p>
            Agrega a los miembros del grupo con quienes dividirás los gastos. En
            el siguiente paso podrás agregar las deudas.
          </p>
          {md && (
            <RoundedButton className='mt-4 w-full min-w-full bg-amber-200 px-8 md:w-min'>
              Deudas
              <IconArrowNarrowRight></IconArrowNarrowRight>
            </RoundedButton>
          )}
        </div>

        <div className='w-full space-y-8'>
          <MemberForm />
          <MemberList members={members} />
        </div>
      </div>

      {!md && (
        <RoundedButton className='mt-4 w-full min-w-full bg-amber-200 px-8 md:w-min'>
          Deudas
          <IconArrowNarrowRight></IconArrowNarrowRight>
        </RoundedButton>
      )}
    </PageContainer>
  );
}

export default Members;
