import { Member } from 'src/features/split-bills/types/member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: { [id: string]: Member };
  membersOrder: string[];
  addMember: (member: Omit<Member, 'id'>) => void;
  deleteMember: (id: string) => void;
  updateMember: (id: string, memberData: Partial<Member>) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: {},
      membersOrder: [],
      addMember: (newMember) => {
        const id = crypto.randomUUID();
        const member: Member = {
          id,
          ...newMember,
        };
        set((state) => ({
          members: { ...state.members, [id]: member },
          membersOrder: [...state.membersOrder, id],
        }));
      },
      deleteMember: (id) => {
        set((state) => {
          const remainingMembers = { ...state.members };
          delete remainingMembers[id];
          return {
            members: remainingMembers,
            membersOrder: state.membersOrder.filter((m) => m !== id),
          };
        });
      },
      updateMember: (id, memberData) => {
        set((state) => {
          const updatedMember = { ...state.members[id], ...memberData };
          return {
            members: { ...state.members, [id]: updatedMember },
          };
        });
      },
    }),
    {
      name: 'members-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
