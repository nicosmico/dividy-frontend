export type MemberId = string;
export interface Member {
  id: MemberId;
  name: string;
  email?: string;
  phone?: string;
  picture: {
    happy: string;
    sad: string;
  };
}
