import { Member } from 'src/features/split-bills/types/member';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MemberStore {
  members: Member[];
  addMember: (member: Member) => void;
  deleteMember: (uuid: string) => void;
  updateMember: (uuid: string, memberData: Partial<Member>) => void;
}
export const useMembersStore = create<MemberStore>()(
  persist(
    (set) => ({
      members: [],
      addMember: (member) => {
        member.picture = `https://doodleipsum.com/100x100/avatar-4?n=${member.uuid}`;
        set((state) => ({ members: [member, ...state.members] }));
      },
      deleteMember: (uuid) => {
        set((state) => ({
          members: state.members.filter((m) => m.uuid !== uuid),
        }));
      },
      updateMember: (uuid, memberData) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.uuid === uuid
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
