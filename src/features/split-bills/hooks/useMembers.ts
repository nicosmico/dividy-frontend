import { useMembersStore } from 'src/features/split-bills/store/useMembersStore';

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const addMember = useMembersStore((state) => state.addMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);
  const updateMember = useMembersStore((state) => state.updateMember);
  const getMember = (id: string) => {
    return members.find((member) => member.id === id);
  };

  return { members, addMember, deleteMember, updateMember, getMember };
}

export default useMembers;
