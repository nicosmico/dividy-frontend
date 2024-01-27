import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomSheet } from 'src/components/ui';

export function EditMembers() {
  const { memberId } = useParams();
  const [openSheet, setOpenSheet] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log(memberId);
  }, []);

  const handleClose = () => {
    setOpenSheet(false);
    navigate('..');
  };

  return (
    <BottomSheet isOpen={openSheet} onClose={handleClose}>
      <h1>Editar miembro</h1>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Nesciunt, amet!
      </p>
      <p>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptas eos
        nesciunt earum blanditiis numquam neque.
      </p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Magni.</p>
    </BottomSheet>
  );
}

export default EditMembers;
