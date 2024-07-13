import { IconBottle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { DefaultValues } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from 'src/components/ui';
import {
  BillItemForm,
  TBillItemForm,
} from 'src/features/split-bills/components/BillItemForm';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { SubmitButton } from 'src/features/split-bills/types/forms';

export function EditBillItemPage() {
  const { billId, itemId } = useParams();
  const { bills, updateItemInBill } = useBills();
  const { members, membersOrder } = useMembers();

  const [item, setItem] = useState<DefaultValues<TBillItemForm>>();
  const [open, setOpen] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!billId || !itemId) return;
    const bill = bills[billId];

    if (!bill) return;
    const item = bill.items.find((item) => item.id === itemId);

    const formMembers = Object.keys(members).reduce(
      (acc, id) => {
        acc[id] = !!item?.members.includes(id);
        return acc;
      },
      {} as Record<string, boolean>
    );

    setItem({
      ...item,
      members: formMembers,
    });
  }, [billId, itemId, bills, members]);

  const handleClose = () => {
    navigate('..');
  };

  const handleEditMember = (values: TBillItemForm) => {
    console.log(values);
    if (!billId || !itemId) return;
    const members = Object.entries(values.members)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    updateItemInBill(billId, itemId, {
      ...values,
      members,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} className='space-y-8'>
      <div>
        {item && (
          <div className='mx-auto aspect-square w-min rounded-full bg-red-400 p-3 text-white'>
            <IconBottle />
          </div>
        )}
        <h1 className='text-center'>Editar item</h1>
      </div>

      {item && (
        <BillItemForm
          defaultValues={item}
          members={membersOrder.map((id) => members[id])}
          onValid={handleEditMember}
          submitButton={SubmitButton.BOTTOM_SAVE_CANCEL}
          onCancel={() => setOpen(false)}
        ></BillItemForm>
      )}
    </Dialog>
  );
}
