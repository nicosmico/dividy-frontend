import { useMembersStore } from 'src/store/useMembersStore';

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const addMember = useMembersStore((state) => state.addMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);
  const getMemberByID = (id: string) => {
    return members.find((member) => member.id === id);
  };

  return { members, addMember, deleteMember, getMemberByID };
}

export default useMembers;
