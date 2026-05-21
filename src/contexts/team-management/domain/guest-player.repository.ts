import type { GuestPlayer } from "./guest-player";
import type { GuestPlayerId } from "./guest-player-id";
import type { TeamId } from "./team-id";

export interface GuestPlayerRepository {
  save(guestPlayer: GuestPlayer): Promise<void>;
  findAllByTeam(teamId: TeamId): Promise<GuestPlayer[]>;
  findById(id: GuestPlayerId): Promise<GuestPlayer | null>;
}
