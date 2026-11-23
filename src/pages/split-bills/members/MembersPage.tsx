import { IconArrowNarrowRight } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router';
import { MemberList } from '@/features/split-bills';
import {
  MemberForm,
  TMemberForm,
} from '@/features/split-bills/components/MemberForm';
import useBills from '@/features/split-bills/hooks/useBills';
import useMembers from '@/features/split-bills/hooks/useMembers';
import { Avatar } from '@/features/split-bills/services/avatar';
import { RoundedLink } from '@/shared';
import { useDialogMessage } from '@/shared/ui/dialog-message/useDialogMessage';

export function MembersPage() {
  const { members, membersOrder, addMember, deleteMember } = useMembers();
  const { bills, deleteBill, updateBill } = useBills();
  const navigate = useNavigate();
  const { showDialog } = useDialogMessage();

  const handleAddMember = (values: TMemberForm) => {
    addMember({
      ...values,
      picture: {
        happy: Avatar.happy(values.name),
        sad: Avatar.sad(values.name),
      },
    });
  };

  const handleDeleteMember = (id: string) => {
    console.log('Delete member', id);
    const ownBills = Object.values(bills).filter((bill) => bill.paidBy === id);
    const debtorBills = Object.values(bills).filter((bill) =>
      bill.members.includes(id)
    );
    const member = members[id];

    const debtorBillsName = debtorBills
      .map((bill) => `"${bill.name}"`)
      .join(', ')
      .replace(/, ([^,]*)$/, ' y $1');
    const ownBillsNames = ownBills
      .map((bill) => `"${bill.name}"`)
      .join(', ')
      .replace(/, ([^,]*)$/, ' y $1');

    // Remove member from bills where are debtor and update the bills
    const updateDebtorBills = () => {
      debtorBills.forEach((bill) => {
        const updatedBill = {
          ...bill,
          members: bill.members.filter((memberId) => memberId !== id),
        };
        updateBill(bill.id, updatedBill);
      });
    };

    if (ownBills.length) {
      showDialog({
        title: 'Eliminar miembro',
        message: `Si eliminas a ${member.name} se eliminarán los gastos que pagó (${ownBillsNames}). También se eliminará de las deudas en las que está. ¿Estás seguro?`,
        buttons: [
          {
            label: 'Cancelar',
            onClick: () => {},
          },
          {
            label: 'Eliminar',
            className: 'bg-red-400 text-white',
            onClick: () => {
              deleteMember(id);
              ownBills.forEach((bill) => {
                deleteBill(bill.id);
              });
              updateDebtorBills();
            },
          },
        ],
      });
    } else {
      showDialog({
        title: 'Eliminar miembro',
        message: `Si eliminas a ${member.name} también se eliminará de las deudas ${debtorBillsName}. ¿Estás seguro?`,
        buttons: [
          {
            label: 'Cancelar',
            onClick: () => {},
          },
          {
            label: 'Eliminar',
            className: 'bg-red-400 text-white',
            onClick: () => {
              deleteMember(id);
              updateDebtorBills();
            },
          },
        ],
      });
    }
  };

  return (
    <>
      <Outlet /> {/* For EditMemberPage */}
      <div className='grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Miembros</h1>
          <p>
            Agrega a los miembros del grupo con quienes dividirás los gastos.
          </p>
        </div>

        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'>
          <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm>

          <MemberList
            members={membersOrder.map((id) => members[id])}
            onDelete={handleDeleteMember}
            onEdit={(member) => navigate(`${member.id}/edit`)}
          />
        </div>

        <div className='bottom-2 md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3'>
          <RoundedLink
            to='../bills'
            disabled={membersOrder.length < 2}
            className='w-full bg-amber-200 px-6 shadow-xs md:max-w-lg'
          >
            Gastos
            <IconArrowNarrowRight></IconArrowNarrowRight>
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default MembersPage;
