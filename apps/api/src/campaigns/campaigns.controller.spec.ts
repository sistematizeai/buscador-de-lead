import { describe, expect, it, vi } from "vitest";
import { CampaignsController } from "./campaigns.controller";

describe("CampaignsController", () => {
  it("uses the current workspace when deleting a campaign", async () => {
    const service = {
      remove: vi.fn().mockResolvedValue({ id: "campaign-1" }),
    };
    const controller = new CampaignsController(service as never);

    await controller.remove("campaign-1", "workspace-1");

    expect(service.remove).toHaveBeenCalledWith("campaign-1", "workspace-1");
  });
});
