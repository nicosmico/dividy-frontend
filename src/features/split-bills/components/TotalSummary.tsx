import { Member } from '../types/member';
import { Summary } from '../types/totals';

interface Props {
  summary: Summary;
  members: { [uuid: string]: Member };
}
export function TotalSummary({ summary, members }: Props) {
  return (
    <>
      <p>{summary.uuid}</p>
      <p>{members[summary.member].name}</p>
      <p>{summary.bills.length}</p>
    </>
  );
}
