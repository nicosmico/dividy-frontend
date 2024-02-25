import { useMembersStore } from 'src/features/split-bills/store/useMembersStore';

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const addMember = useMembersStore((state) => state.addMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);
  const updateMember = useMembersStore((state) => state.updateMember);
  const getMember = (uuid: string) => {
    return members.find((member) => member.uuid === uuid);
  };

  return { members, addMember, deleteMember, updateMember, getMember };
}

export default useMembers;
