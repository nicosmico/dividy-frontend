import { useParams } from 'react-router-dom';
import { useDebt } from './useDebt';

const useUrlDebt = () => {
  const { debtId } = useParams();
  const { indexedDebts } = useDebt();
  return debtId ? indexedDebts[debtId] : undefined;
};

export default useUrlDebt;
