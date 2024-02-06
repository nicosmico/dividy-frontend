import { Member } from 'src/models/Member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: Member[];
  addMember: (member: Member) => void;
  deleteMember: (member: Member) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: [],
      addMember: (member) => {
        set((state) => ({ members: [member, ...state.members] }));
      },
      deleteMember: (member) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== member.id),
        }));
      },
    }),
    {
      name: 'members-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);