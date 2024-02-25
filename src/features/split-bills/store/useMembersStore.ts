import { Member } from 'src/features/split-bills/types/member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: { [uuid: string]: Member };
  membersOrder: string[];
  addMember: (member: Member) => void;
  deleteMember: (uuid: string) => void;
  updateMember: (uuid: string, memberData: Partial<Member>) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: {},
      membersOrder: [],
      addMember: (member) => {
        set((state) => ({
          members: { ...state.members, [member.uuid]: member },
          membersOrder: [...state.membersOrder, member.uuid],
        }));
      },
      deleteMember: (uuid) => {
        set((state) => {
          const remainingMembers = { ...state.members };
          delete remainingMembers[uuid];
          return {
            members: remainingMembers,
            membersOrder: state.membersOrder.filter((m) => m !== uuid),
          };
        });
      },
      updateMember: (uuid, memberData) => {
        set((state) => {
          const updatedMember = { ...state.members[uuid], ...memberData };
          return {
            members: { ...state.members, [uuid]: updatedMember },
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
