import { IconPlus, IconReceipt } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoundedButton, Status } from 'src/components/ui';
import useBills from '../hooks/useBills';
import useMembers from '../hooks/useMembers';

export function BillsFormList() {
  const { bills, billsOrder } = useBills();
  const { members, membersOrder } = useMembers();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(bills);
  }, [bills, billsOrder]);

  return (
    <>
      {billsOrder.length ? (
        <div>
          <ul className='space-y-2'>
            {billsOrder.map((id) => (
              <li key={id}>
                {/* <BillCard
                  id={id}
                  bill={bills[id]}
                  members={membersOrder.map((id) => members[id])}
                  onEditItem={(billId, itemId) =>
                    navigate(`${billId}/item/${itemId}/edit`)
                  }
                ></BillCard> */}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Status
          title='Agrega una boleta'
          description='Debes agregar al menos una boleta'
          icon={<IconReceipt size={48}></IconReceipt>}
          className='pt-8'
        />
      )}
      <RoundedButton className='mx-auto bg-zinc-900 px-4 py-1 text-sm text-white'>
        <IconPlus size={16} />
        Agregar boleta
      </RoundedButton>
    </>
  );
}
