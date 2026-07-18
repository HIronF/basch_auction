/**
 * api.js - Centralized REST API client for BASCH Tournament Auction Console
 */

const API = {
    async fetchState() {
        const res = await fetch("/api/state/");
        if (!res.ok) throw new Error("Failed to fetch state");
        return await res.json();
    },

    async startAuction() {
        const res = await fetch("/api/start/", { method: "POST" });
        return await res.json();
    },

    async pauseAuction() {
        const res = await fetch("/api/pause/", { method: "POST" });
        return await res.json();
    },

    async resumeAuction() {
        const res = await fetch("/api/resume/", { method: "POST" });
        return await res.json();
    },

    async resetAuction(type = "all") {
        const res = await fetch("/api/reset/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type })
        });
        return await res.json();
    },

    async placeBid(teamId, amount) {
        const res = await fetch("/api/bid/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team_id: teamId, amount: amount })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to place bid");
        return data;
    },

    async bumpBid(increment) {
        const res = await fetch("/api/bump-bid/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ increment })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update bid");
        return data;
    },

    async setBidAmount(amount) {
        const res = await fetch("/api/bump-bid/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to set bid amount");
        return data;
    },

    async sellPlayer() {
        const res = await fetch("/api/sell/", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sell player");
        return data;
    },

    async markUnsold() {
        const res = await fetch("/api/unsold/", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to mark unsold");
        return data;
    },

    async undoBid() {
        const res = await fetch("/api/undo-bid/", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to undo bid");
        return data;
    },

    async undoSold() {
        const res = await fetch("/api/undo-sold/", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to undo sold player");
        return data;
    },

    // CRUD Teams
    async createTeam(teamData) {
        const res = await fetch("/api/teams/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamData)
        });
        return await res.json();
    },
    async updateTeam(id, teamData) {
        const res = await fetch(`/api/teams/${id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamData)
        });
        return await res.json();
    },
    async deleteTeam(id) {
        const res = await fetch(`/api/teams/${id}/`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete team");
        return data;
    },

    // CRUD Players
    async createPlayer(playerData) {
        const res = await fetch("/api/players/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(playerData)
        });
        return await res.json();
    },
    async updatePlayer(id, playerData) {
        const res = await fetch(`/api/players/${id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(playerData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update player");
        return data;
    },
    async deletePlayer(id) {
        const res = await fetch(`/api/players/${id}/`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete player");
        return data;
    },

    // CRUD Categories
    async createCategory(catData) {
        const res = await fetch("/api/categories/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(catData)
        });
        return await res.json();
    },
    async updateCategory(id, catData) {
        const res = await fetch(`/api/categories/${id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(catData)
        });
        return await res.json();
    },
    async deleteCategory(id) {
        const res = await fetch(`/api/categories/${id}/`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete category");
        return data;
    },

    // Settings
    async updateSettings(settingsData) {
        const res = await fetch("/api/settings/", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settingsData)
        });
        return await res.json();
    },

    // Import JSON
    async importStateJson(jsonString) {
        let payload;
        try {
            payload = JSON.parse(jsonString);
        } catch (e) {
            throw new Error("Invalid JSON format");
        }
        const res = await fetch("/api/import/json/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import JSON");
        return data;
    }
};

window.API = API;
