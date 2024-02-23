import { Member } from 'src/features/split-bills/types/member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: Member[];
  addMember: (member: Member) => void;
  deleteMember: (member: Member) => void;
  updateMember: (id: string, member: Member) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: [],
      addMember: (member) => {
        member.picture = `https://doodleipsum.com/100x100/avatar-4?n=${member.id}`;
        set((state) => ({ members: [member, ...state.members] }));
      },
      deleteMember: (member) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== member.id),
        }));
      },
      updateMember: (id, member) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? member : m)),
        }));
      },
    }),
    {
      name: 'members-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);