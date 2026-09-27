import { describe, expect, it } from "vitest";

describe("Campaign Scheduler", () => {
  describe("Scheduled campaign detection", () => {
    it("should identify campaigns due for execution", () => {
      const now = Date.now();
      const campaigns = [
        { id: 1, status: "scheduled", metrics: JSON.stringify({ scheduledAt: new Date(now - 60000).toISOString() }) },
        { id: 2, status: "scheduled", metrics: JSON.stringify({ scheduledAt: new Date(now + 60000).toISOString() }) },
        { id: 3, status: "draft", metrics: null },
        { id: 4, status: "completed", metrics: JSON.stringify({ sent: 100 }) },
      ];

      const scheduled = campaigns.filter(c => c.status === "scheduled");
      expect(scheduled).toHaveLength(2);

      const due = scheduled.filter(c => {
        try {
          const m = JSON.parse(c.metrics || "{}");
          return m.scheduledAt && new Date(m.scheduledAt).getTime() <= now;
        } catch { return false; }
      });
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe(1);
    });

    it("should skip campaigns without scheduledAt in metrics", () => {
      const campaigns = [
        { id: 1, status: "scheduled", metrics: JSON.stringify({ body: "test" }) },
        { id: 2, status: "scheduled", metrics: null },
        { id: 3, status: "scheduled", metrics: "invalid json{" },
      ];

      const due = campaigns.filter(c => {
        try {
          const m = JSON.parse(c.metrics || "{}");
          return m.scheduledAt && new Date(m.scheduledAt).getTime() <= Date.now();
        } catch { return false; }
      });
      expect(due).toHaveLength(0);
    });

    it("should not fire future-scheduled campaigns", () => {
      const futureDate = new Date(Date.now() + 86400000); // 24h from now
      const campaign = {
        id: 1,
        status: "scheduled",
        metrics: JSON.stringify({ scheduledAt: futureDate.toISOString(), body: "Hello" }),
      };

      const m = JSON.parse(campaign.metrics);
      const isDue = new Date(m.scheduledAt).getTime() <= Date.now();
      expect(isDue).toBe(false);
    });
  });

  describe("Campaign scheduler service", () => {
    it("should export start/stop/status functions", async () => {
      const { startCampaignScheduler, stopCampaignScheduler, isSchedulerRunning } = await import("./services/campaignScheduler");
      expect(typeof startCampaignScheduler).toBe("function");
      expect(typeof stopCampaignScheduler).toBe("function");
      expect(typeof isSchedulerRunning).toBe("function");
    });

    it("should report not running before start", async () => {
      const { isSchedulerRunning, stopCampaignScheduler } = await import("./services/campaignScheduler");
      stopCampaignScheduler(); // ensure clean state
      expect(isSchedulerRunning()).toBe(false);
    });
  });

  describe("Metrics JSON parsing", () => {
    it("should handle string metrics", () => {
      const raw = JSON.stringify({ scheduledAt: "2027-01-01T00:00:00Z", body: "test", contactIds: [1, 2, 3] });
      const parsed = JSON.parse(raw);
      expect(parsed.scheduledAt).toBe("2027-01-01T00:00:00Z");
      expect(parsed.contactIds).toEqual([1, 2, 3]);
    });

    it("should safely handle malformed metrics", () => {
      const badInputs = [null, undefined, "", "not json", "123"];
      for (const input of badInputs) {
        let result: any = null;
        try { result = JSON.parse(input || "{}"); } catch { result = null; }
        expect(result === null || typeof result === "object" || typeof result === "number").toBe(true);
      }
    });
  });
});
