import { Member } from 'src/features/split-bills/types/member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: Member[];
  addMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  updateMember: (id: string, memberData: Partial<Member>) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: [],
      addMember: (member) => {
        member.picture = `https://doodleipsum.com/100x100/avatar-4?n=${member.id}`;
        set((state) => ({ members: [member, ...state.members] }));
      },
      deleteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },
      updateMember: (id, memberData) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id
              ? {
                  ...m,
                  ...memberData,
                }
              : m
          ),
        }));
      },
    }),
    {
      name: 'members-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
