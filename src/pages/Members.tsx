import { IconArrowNarrowRight } from '@tabler/icons-react';
import { MemberForm, MemberList } from 'src/components';
import { Container, RoundedButton } from 'src/components/ui';
import { Member } from 'src/models/Member';

export function Members() {
  const members: Member[] = [
    {
      id: crypto.randomUUID(),
      name: 'Nico',
      email: 'nico@gmail.com',
      phone: '931220127',
    },
    { id: crypto.randomUUID(), name: 'Tamara' },
    { id: crypto.randomUUID(), name: 'Manuel' },
  ];

  return (
    <Container className='space-y-4 pt-8'>
      <div className='space-y-4 lg:flex lg:gap-4'>
        <div className='grid w-full place-content-center text-center'>
          <h1 className='text-xl font-bold'>Miembros</h1>
          <p className='lg:text-balance'>
            Agrega a los miembros del grupo con quienes dividirás los gastos. En
            el siguiente paso podrás agregar las deudas.
          </p>
        </div>

        <div className='w-full space-y-8'>
          <MemberForm />

          <MemberList members={members} />
        </div>
      </div>

      <div className='flex w-full justify-center md:justify-end'>
        <RoundedButton className='flex w-full justify-center gap-2 bg-amber-200 px-8 md:w-min'>
          Deudas
          <IconArrowNarrowRight></IconArrowNarrowRight>
        </RoundedButton>
      </div>
    </Container>
  );
}

export default Members;
