import { IconBottle } from '@tabler/icons-react';
import { useDebt } from 'src/features/split-bills/hooks/useDebt';
import { Card, Container, IconButton } from 'src/shared';

export function DebtsPage() {
  const { allDebts } = useDebt();

  return (
    <Container>
      <div className='w-full gap-3'>
        <div className='space-y-2 text-center md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Grupo de deudas</h1>
          <p>
            Cada vez que crees un grupo de deudas se listará acá
          </p>
        </div>

        <div className='space-y-8'>
          {/* <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm> */}

          <ul className='space-y-2'>
            {allDebts.map((debt) => (
              <li key={debt.id}>
                <Card
                  className='flex items-center justify-between shadow-sm'
                >
                  <div className='flex w-full items-center gap-4'>
                    <div className='aspect-square rounded-full bg-red-400 p-3 text-white'>
                      <IconBottle />
                    </div>
                    <span>{debt.title}</span>
                  </div>

                  <IconButton
                    className='text-red-400 md:hover:bg-red-400 md:hover:text-white'
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(member.id);
                    }}
                  >
                    <IconX></IconX>
                  </IconButton>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}

export default DebtsPage;
