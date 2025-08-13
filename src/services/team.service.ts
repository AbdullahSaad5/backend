import { Team } from "@/models/team.model";
import { TeamCreatePayload, TeamUpdatePayload } from "@/contracts/team.contract";

export const teamService = {
  getAllTeams: () => {
    return Team.find().populate('userCategoryId', 'role description');
  },

  getTeamsByCategory: (userCategoryId: string) => {
    return Team.find({ userCategoryId }).populate('userCategoryId', 'role description');
  },

  createTeam: (data: TeamCreatePayload) => {
    const newTeam = new Team(data);
    return newTeam.save();
  },

  getTeamById: (id: string) => {
    return Team.findById(id).populate('userCategoryId', 'role description');
  },

  updateTeam: (id: string, data: TeamUpdatePayload) => {
    return Team.findByIdAndUpdate(id, data, { new: true });
  },

  deleteTeam: (id: string) => {
    const team = Team.findByIdAndDelete(id);
    if (!team) {
      throw new Error("Team not found");
    }
    return team;
  },

  toggleStatus: async (id: string, isActive: boolean) => {
    const updatedTeam = await Team.findByIdAndUpdate(
      id, 
      { isActive }, 
      { new: true }
    );
    if (!updatedTeam) {
      throw new Error("Team not found");
    }
    return updatedTeam;
  },
};
