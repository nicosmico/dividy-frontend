import { useMembersStore } from 'src/features/split-bills/store/useMembersStore';

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const membersOrder = useMembersStore((state) => state.membersOrder);
  const addMember = useMembersStore((state) => state.addMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);
  const updateMember = useMembersStore((state) => state.updateMember);

  return { members, membersOrder, addMember, deleteMember, updateMember };
}

export default useMembers;
