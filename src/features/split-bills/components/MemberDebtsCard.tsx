import { Member } from '../types/member';
import { MemberDebts } from '../types/totals';

interface Props {
  memberDebts: MemberDebts;
  members: { [uuid: string]: Member };
}
export function MemberDebtsCard({ memberDebts, members }: Props) {
  return (
    <>
      <p>{memberDebts.uuid}</p>
      <p>{members[memberDebts.member].name}</p>
      <p>Cantidad de deudas: {memberDebts.debts.length}</p>
      <p>
        Total de deudas:{' '}
        {memberDebts.debts.reduce((acc, i) => (acc += i.total), 0)}
      </p>
    </>
  );
}
