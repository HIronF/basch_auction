/**
 * app.js - Main Application Controller for CS Tennis Academy Pickleball Console
 */

class Application {
    constructor() {
        this.state = null;
        this.selectedCategoryId = null;
        this.selectedQueue = "live";
        this.rightPanelTab = "history";
        this.syncInterval = null;
        this.timerInterval = null;
        this.audioCtx = null;
    }

    async init() {
        this.setupAudio();
        this.setupEventListeners();
        await this.sync();
        
        // 2-second auto-sync for multi-user / display support
        this.syncInterval = setInterval(() => this.sync(true), 2000);

        // Digital countdown timer ticker (1s)
        this.timerInterval = setInterval(() => this.tickTimer(), 1000);
    }

    setupAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }

    playTone(freq, duration, type = "sine") {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    }

    soundBid() { this.playTone(600, 0.15, "triangle"); }
    soundSold() {
        this.playTone(523.25, 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.2), 150); // E5
        setTimeout(() => this.playTone(783.99, 0.4), 300); // G5
    }
    soundError() { this.playTone(200, 0.3, "sawtooth"); }

    showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        const icons = { success: "✅", error: "❌", info: "ℹ️" };
        toast.innerHTML = `<span>${icons[type] || ""}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px)";
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    async sync(silent = false) {
        try {
            const newState = await API.fetchState();
            this.state = newState;
            this.renderAll();
        } catch (e) {
            if (!silent) console.error("Sync error:", e);
        }
    }

    tickTimer() {
        if (!this.state || !this.state.settings) return;
        const s = this.state.settings;
        if (s.auction_status === "LIVE" && s.timer_remaining > 0) {
            s.timer_remaining -= 1;
            const timerEl = document.getElementById("timerDisplay");
            if (timerEl) {
                timerEl.textContent = `${s.timer_remaining}s`;
                if (s.timer_remaining <= 5) {
                    timerEl.style.color = "#EF4444";
                } else {
                    timerEl.style.color = "#F59E0B";
                }
            }
        }
    }

    renderAll() {
        if (!this.state) return;
        if (this.state.settings && this.state.settings.current_player_id !== this._lastPlayerId) {
            this._lastPlayerId = this.state.settings.current_player_id;
            this.selectedCustomAmount = null;
            this.selectedIncrement = (this.state.settings.bid_increments && this.state.settings.bid_increments[0]) ? this.state.settings.bid_increments[0] : 10;
            const cInp = document.getElementById("customBidInput");
            if (cInp) cInp.value = "";
        }
        try { if (typeof Render.header === "function") Render.header(this.state); } catch (e) { console.warn("Render.header error:", e); }
        try { if (typeof Render.progressBar === "function") Render.progressBar(this.state); } catch (e) { console.warn("Render.progressBar error:", e); }
        try {
            if (typeof Render.categoryTabs === "function") {
                Render.categoryTabs(this.state, this.selectedCategoryId, (catId) => {
                    this.selectedCategoryId = catId;
                    this.renderAll();
                });
            }
        } catch (e) { console.warn("Render.categoryTabs error:", e); }
        try {
            if (typeof Render.teams === "function") {
                Render.teams(this.state, (team) => {
                    if (typeof Render.teamDetailsModal === "function") {
                        Render.teamDetailsModal(team, this.state.settings.currency_icon);
                        const modal = document.getElementById("teamDetailsModal");
                        if (modal) modal.classList.remove("hidden");
                    }
                });
            }
        } catch (e) { console.warn("Render.teams error:", e); }
        try {
            if (typeof Render.liveArena === "function") {
                Render.liveArena(
                    this.state,
                    (stepIncrement) => this.handleStepBid(stepIncrement),
                    (teamId) => this.handleQuickTeamBid(teamId)
                );
            }
        } catch (e) { console.warn("Render.liveArena error:", e); }
        try { if (typeof Render.rightPanel === "function") Render.rightPanel(this.state, this.rightPanelTab); } catch (e) { console.warn("Render.rightPanel error:", e); }
        try {
            if (typeof Render.upcomingSlider === "function") {
                Render.upcomingSlider(this.state, this.selectedQueue, this.selectedCategoryId, (player) => {
                    if (player.status === "Upcoming" || player.status === "Unsold") {
                        API.updatePlayer(player.id, { status: "Live" })
                            .then(() => {
                                this.showToast(`${player.name} loaded to desk!`, "success");
                                this.sync();
                            })
                            .catch(e => this.showToast(e.message, "error"));
                    }
                });
            }
        } catch (e) { console.warn("Render.upcomingSlider error:", e); }

        // Check if tournament completed
        if (this.state.settings && this.state.settings.auction_status === "COMPLETED" && this.state.players.length > 0) {
            this.showFinalSummary();
        }
    }

    // Bid Handlers
    async handleStepBid(increment) {
        if (!this.state || !this.state.settings.current_player_id) {
            this.showToast("No active player on the desk!", "error");
            return;
        }
        this.selectedIncrement = increment;
        this.selectedCustomAmount = null;
        const customInput = document.getElementById("customBidInput");
        if (customInput) customInput.value = "";
        this.renderAll();
        
        const s = this.state.settings;
        let targetAmount = s.highest_bid + increment;
        if (s.highest_bidder_id === null) {
            targetAmount = s.highest_bid;
        }
        this.showToast(`+${increment} selected! Click any team card below to place bid of ${targetAmount.toLocaleString()}.`, "info");
    }

    async handleQuickTeamBid(teamId) {
        if (!this.state || !this.state.settings.current_player_id) {
            this.showToast("No active player to bid on!", "error");
            return;
        }
        const s = this.state.settings;
        let amount = null;

        if (this.selectedCustomAmount !== null && this.selectedCustomAmount !== undefined && !isNaN(this.selectedCustomAmount)) {
            amount = parseInt(this.selectedCustomAmount);
        } else {
            const inc = (this.selectedIncrement !== null && this.selectedIncrement !== undefined) ? this.selectedIncrement : ((s.bid_increments && s.bid_increments[0]) ? s.bid_increments[0] : 10);
            if (s.highest_bidder_id === null) {
                amount = s.highest_bid;
            } else {
                amount = s.highest_bid + inc;
            }
        }

        try {
            const newState = await API.placeBid(teamId, amount);
            if (newState) {
                this.state = newState;
                if (this.selectedCustomAmount !== null && this.selectedCustomAmount !== undefined) {
                    this.selectedCustomAmount = null;
                    const customInput = document.getElementById("customBidInput");
                    if (customInput) customInput.value = "";
                    if (this.selectedIncrement === null) {
                        this.selectedIncrement = (s.bid_increments && s.bid_increments[0]) ? s.bid_increments[0] : 10;
                    }
                }
                this.renderAll();
            }
            this.soundBid();
            const bidTeam = this.state.teams.find(t => t.id === teamId);
            const tName = bidTeam ? bidTeam.name : "Team";
            this.showToast(`${tName} bids ${amount.toLocaleString()}!`, "success");
            await this.sync();
        } catch (e) {
            this.soundError();
            this.showToast(e.message, "error");
        }
    }

    setupEventListeners() {
        // Start / Pause button
        const startBtn = document.getElementById("btnStartPause");
        if (startBtn) {
            startBtn.addEventListener("click", async () => {
                const s = this.state.settings;
                if (s.auction_status === "LIVE") {
                    await API.pauseAuction();
                    this.showToast("Auction Paused ⏸", "info");
                } else {
                    await API.startAuction();
                    this.showToast("Auction Started Successfully", "success");
                }
                await this.sync();
            });
        }

        // Reset Dropdown toggle & items
        const resetMenuBtn = document.getElementById("btnResetMenu");
        if (resetMenuBtn) {
            resetMenuBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                document.getElementById("resetDropdown").classList.toggle("hidden");
            });
        }
        document.addEventListener("click", () => {
            const dd = document.getElementById("resetDropdown");
            if (dd) dd.classList.add("hidden");
        });
        document.querySelectorAll(".dropdown-item[data-reset]").forEach(item => {
            item.addEventListener("click", async (e) => {
                e.preventDefault();
                const resetType = item.getAttribute("data-reset");
                if (confirm(`Are you sure you want to reset (${resetType})?`)) {
                    await API.resetAuction(resetType);
                    this.showToast("Auction state reset successfully!", "success");
                    await this.sync();
                }
            });
        });

        // Queue switcher dropdown (Upcoming, Sold, Unsold)
        const queueDropdown = document.getElementById("queueSelectDropdown");
        if (queueDropdown) {
            queueDropdown.addEventListener("change", (e) => {
                this.selectedQueue = e.target.value;
                this.renderAll();
            });
        }
        // Legacy queue switcher tabs support
        document.querySelectorAll(".queue-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".queue-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.selectedQueue = tab.getAttribute("data-queue");
                if (queueDropdown) queueDropdown.value = this.selectedQueue;
                this.renderAll();
            });
        });

        // Right Info Panel tabs
        document.querySelectorAll(".right-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".right-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".right-tab-content").forEach(c => c.classList.add("hidden"));
                tab.classList.add("active");
                this.rightPanelTab = tab.getAttribute("data-rtab");
                const targetEl = document.getElementById(`rtab-${this.rightPanelTab}`);
                if (targetEl) targetEl.classList.remove("hidden");
                this.renderAll();
            });
        });

        // Custom Bid Button & Input Enter
        const customBidBtn = document.getElementById("btnCustomBid");
        const customBidInputEl = document.getElementById("customBidInput");
        if (customBidBtn) {
            customBidBtn.addEventListener("click", () => {
                const val = parseInt(document.getElementById("customBidInput").value);
                if (!val || isNaN(val) || val <= 0) {
                    this.showToast("Enter a valid custom bid amount first!", "error");
                    return;
                }
                this.selectedCustomAmount = val;
                this.selectedIncrement = null;
                this.renderAll();
                this.showToast(`Custom amount ${val.toLocaleString()} selected! Click any team card below to place bid.`, "info");
            });
        }
        if (customBidInputEl && customBidBtn) {
            customBidInputEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    customBidBtn.click();
                }
            });
            customBidInputEl.addEventListener("input", () => {
                const val = parseInt(customBidInputEl.value);
                if (val && !isNaN(val) && val > 0) {
                    this.selectedCustomAmount = val;
                    this.selectedIncrement = null;
                    this.renderAll();
                }
            });
        }

        // Action Bar: Undo Bid
        const undoBidBtn = document.getElementById("btnUndoBid");
        if (undoBidBtn) {
            undoBidBtn.addEventListener("click", async () => {
                try {
                    await API.undoBid();
                    this.showToast("Last bid undone ↩", "info");
                    await this.sync();
                } catch (e) {
                    this.showToast(e.message, "error");
                }
            });
        }

        // Action Bar: Mark Sold
        const markSoldBtn = document.getElementById("btnMarkSold");
        if (markSoldBtn) {
            markSoldBtn.addEventListener("click", () => {
                const s = this.state.settings;
                if (!s.current_player_id) {
                    this.showToast("No active player to sell!", "error");
                    return;
                }
                if (!s.highest_bidder_id) {
                    this.showToast("Cannot sell player without any bids!", "error");
                    return;
                }
                const p = this.state.players.find(x => x.id === s.current_player_id);
                const team = this.state.teams.find(t => t.id === s.highest_bidder_id);
                document.getElementById("modalSoldPhoto").src = p ? p.photo : "";
                document.getElementById("modalSoldPlayerName").textContent = p ? p.name : "Player";
                document.getElementById("modalSoldTeamName").textContent = s.highest_bidder_name;
                document.getElementById("modalSoldPrice").textContent = s.highest_bid.toLocaleString();
                // Set team logo and border color
                const logoEl = document.getElementById("modalSoldTeamLogo");
                const cardEl = document.getElementById("modalSoldTeamCard");
                if (logoEl && team) {
                    logoEl.src = team.logo || "";
                    logoEl.style.display = team.logo ? "block" : "none";
                }
                if (cardEl && team) {
                    cardEl.style.borderColor = team.color || "var(--border-color)";
                    cardEl.style.background = team.color ? `${team.color}10` : "#F8FAFC";
                }
                document.getElementById("soldConfirmModal").classList.remove("hidden");
            });
        }

        const cancelSoldBtn = document.getElementById("btnCancelSold");
        if (cancelSoldBtn) {
            cancelSoldBtn.addEventListener("click", () => {
                document.getElementById("soldConfirmModal").classList.add("hidden");
            });
        }

        const confirmSoldBtn = document.getElementById("btnConfirmSoldAction");
        if (confirmSoldBtn) {
            confirmSoldBtn.addEventListener("click", async () => {
                try {
                    document.getElementById("soldConfirmModal").classList.add("hidden");
                    await API.sellPlayer();
                    this.soundSold();
                    this.showToast("Player SOLD successfully!", "success");
                    await this.sync();
                } catch (e) {
                    this.showToast(e.message, "error");
                }
            });
        }

        // Action Bar: Mark Unsold
        const markUnsoldBtn = document.getElementById("btnMarkUnsold");
        if (markUnsoldBtn) {
            markUnsoldBtn.addEventListener("click", async () => {
                if (confirm("Skip current player and mark as Unsold?")) {
                    try {
                        await API.markUnsold();
                        this.showToast("Player marked Unsold ⏭", "info");
                        await this.sync();
                    } catch (e) {
                        this.showToast(e.message, "error");
                    }
                }
            });
        }

        // Action Bar: Undo Last Sold
        const undoSoldBtn = document.getElementById("btnUndoSold");
        if (undoSoldBtn) {
            undoSoldBtn.addEventListener("click", async () => {
                if (confirm("Reverse last sold player and refund coins to team?")) {
                    try {
                        await API.undoSold();
                        this.showToast("Last sale reversed ⏪", "info");
                        await this.sync();
                    } catch (e) {
                        this.showToast(e.message, "error");
                    }
                }
            });
        }

        // Extend Timer button (+15s)
        const extendTimerBtn = document.getElementById("btnExtendTimer");
        if (extendTimerBtn) {
            extendTimerBtn.addEventListener("click", async () => {
                if (this.state && this.state.settings) {
                    this.state.settings.timer_remaining += 15;
                    document.getElementById("timerDisplay").textContent = `${this.state.settings.timer_remaining}s`;
                    this.showToast("Added +15s to timer ⏱", "info");
                    await API.updateSettings({ timer: this.state.settings.timer });
                }
            });
        }

        // Load Next Player button
        const loadNextBtn = document.getElementById("btnLoadNextPlayer");
        if (loadNextBtn) {
            loadNextBtn.addEventListener("click", async () => {
                const upcoming = this.state.players.find(x => x.status === "Upcoming");
                if (upcoming) {
                    await API.updatePlayer(upcoming.id, { status: "Live" });
                    await this.sync();
                } else {
                    this.showToast("No upcoming players left in the pool!", "error");
                }
            });
        }

        // Team Modal close
        const closeTeamModalBtn = document.getElementById("btnCloseTeamModal");
        if (closeTeamModalBtn) {
            closeTeamModalBtn.addEventListener("click", () => {
                document.getElementById("teamDetailsModal").classList.add("hidden");
            });
        }

        // Global Search Bar
        const searchInput = document.getElementById("globalSearchInput");
        const searchDropdown = document.getElementById("searchResultsDropdown");
        if (searchInput && searchDropdown) {
            searchInput.addEventListener("input", () => {
                const q = searchInput.value.toLowerCase().trim();
                if (!q || !this.state) {
                    searchDropdown.classList.add("hidden");
                    return;
                }
                searchDropdown.innerHTML = "";
                let count = 0;
                this.state.players.forEach(p => {
                    if (p.name.toLowerCase().includes(q) && count < 8) {
                        const div = document.createElement("div");
                        div.className = "search-item";
                        div.innerHTML = `<span>👤 <strong>${p.name}</strong> (${p.category_name})</span> <span>Base: ${p.base_price} • [${p.status}]</span>`;
                        div.onclick = () => {
                            searchDropdown.classList.add("hidden");
                            searchInput.value = "";
                            this.showToast(`Selected ${p.name}`, "info");
                        };
                        searchDropdown.appendChild(div);
                        count++;
                    }
                });
                if (count > 0) searchDropdown.classList.remove("hidden");
                else searchDropdown.classList.add("hidden");
            });
            document.addEventListener("click", (e) => {
                if (e.target !== searchInput) searchDropdown.classList.add("hidden");
            });
        }

        // Global Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
            if (e.code === "Space") {
                e.preventDefault();
                const startBtn = document.getElementById("btnStartPause");
                if (startBtn) startBtn.click();
            } else if (e.key.toLowerCase() === "s") {
                e.preventDefault();
                const soldBtn = document.getElementById("btnMarkSold");
                if (soldBtn) soldBtn.click();
            } else if (e.key.toLowerCase() === "u") {
                e.preventDefault();
                const unsoldBtn = document.getElementById("btnMarkUnsold");
                if (unsoldBtn) unsoldBtn.click();
            }
        });
    }

    showFinalSummary() {
        const modal = document.getElementById("finalSummaryModal");
        if (modal && modal.classList.contains("hidden")) {
            const st = this.state.statistics;
            document.getElementById("sumMostExpensivePlayer").textContent = st.most_expensive_player;
            document.getElementById("sumMostExpensivePrice").textContent = st.most_expensive_price.toLocaleString();
            document.getElementById("sumRichestTeam").textContent = st.richest_team;
            document.getElementById("sumRichestTeamCoins").textContent = `${this.state.settings.currency_icon} ${st.richest_team_coins} remaining`;
            modal.classList.remove("hidden");
            this.soundSold();
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    window.App = new Application();
    window.App.init();
});
