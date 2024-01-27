import { useMembersStore } from 'src/store/useMembersStore';

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const addMember = useMembersStore((state) => state.addMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);

  return { members, addMember, deleteMember };
}

export default useMembers;
