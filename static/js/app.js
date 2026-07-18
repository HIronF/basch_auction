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

    soundHammer() {
        // Deep knock + metallic click for gavel feel
        this.playTone(90, 0.18, "square");
        setTimeout(() => this.playTone(180, 0.12, "sawtooth"), 80);
        setTimeout(() => this.playTone(420, 0.08, "triangle"), 140);
        setTimeout(() => this.soundSold(), 220);
    }

    animateCoins(from, to, el, duration = 900) {
        if (!el) return;
        const start = performance.now();
        const diff = to - from;
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(from + diff * eased).toLocaleString();
            if (t < 1) requestAnimationFrame(step);
            else el.textContent = to.toLocaleString();
        };
        requestAnimationFrame(step);
    }

    burstConfetti(durationMs = 1800) {
        const canvas = document.getElementById("confettiCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        ctx.scale(dpr, dpr);

        const colors = ["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F4B400"];
        const pieces = Array.from({ length: 140 }, () => ({
            x: Math.random() * window.innerWidth,
            y: -20 - Math.random() * window.innerHeight * 0.4,
            w: 6 + Math.random() * 8,
            h: 8 + Math.random() * 10,
            vx: -2 + Math.random() * 4,
            vy: 2 + Math.random() * 5,
            rot: Math.random() * Math.PI,
            vr: -0.2 + Math.random() * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));

        const start = performance.now();
        const draw = (now) => {
            const elapsed = now - start;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            pieces.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.rot += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (elapsed < durationMs) requestAnimationFrame(draw);
            else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        };
        requestAnimationFrame(draw);
    }

    async playSoldCelebration({ player, team, price, coinsBefore, coinsAfter }) {
        const overlay = document.getElementById("soldCelebration");
        if (!overlay) return;
        this._celebrating = true;

        document.getElementById("soldCelebPhoto").src = player.photo || "";
        document.getElementById("soldCelebPlayer").textContent = (player.name || "").toUpperCase();
        document.getElementById("soldCelebCategory").textContent = (player.category_name || "").toUpperCase();
        document.getElementById("soldCelebTeam").textContent = (team.name || "").toUpperCase();
        document.getElementById("soldCelebTeam").style.color = team.color || "#111827";
        const logo = document.getElementById("soldCelebTeamLogo");
        if (logo) {
            logo.src = team.logo || "";
            logo.style.display = team.logo ? "block" : "none";
        }
        document.getElementById("soldCelebPrice").textContent = `${price.toLocaleString()} COINS`;

        // Show pre-sale coins on the right panel before counting down
        const coinEl = document.querySelector(`.bidder-row[data-team-id="${team.id}"] [data-coin-value]`);
        if (coinEl) coinEl.textContent = coinsBefore.toLocaleString();

        overlay.classList.remove("hidden");
        overlay.classList.add("show");
        this.soundHammer();
        this.burstConfetti(2000);

        const flyer = document.getElementById("flyingPlayerCard");
        const photoEl = document.getElementById("activePlayerPhoto");
        const teamRow = document.querySelector(`.team-row-compact[data-team-id="${team.id}"]`);
        if (flyer && photoEl) {
            const from = photoEl.getBoundingClientRect();
            flyer.innerHTML = `<img src="${player.photo || ''}" alt=""><span>${player.name}</span>`;
            flyer.classList.remove("hidden");
            flyer.style.left = `${from.left}px`;
            flyer.style.top = `${from.top}px`;
            flyer.style.width = `${from.width}px`;
            flyer.style.height = `${from.height}px`;
            flyer.style.opacity = "1";
            flyer.style.transform = "scale(1)";

            requestAnimationFrame(() => {
                const to = teamRow ? teamRow.getBoundingClientRect() : { left: 40, top: window.innerHeight / 2, width: 60, height: 60 };
                flyer.style.transition = "all 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
                flyer.style.left = `${to.left + 12}px`;
                flyer.style.top = `${to.top + 8}px`;
                flyer.style.width = "48px";
                flyer.style.height = "48px";
                flyer.style.opacity = "0.15";
                flyer.style.transform = "scale(0.4)";
            });
        }

        setTimeout(() => {
            this.animateCoins(coinsBefore, coinsAfter, coinEl, 900);
        }, 400);

        await new Promise(r => setTimeout(r, 2200));

        overlay.classList.remove("show");
        overlay.classList.add("hidden");
        if (flyer) {
            flyer.classList.add("hidden");
            flyer.style.transition = "none";
        }
        this._celebrating = false;
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
        if (this._celebrating) return;
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
                    this.handleCategorySelect(catId);
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

    async handleCategorySelect(catId) {
        this.selectedCategoryId = catId;
        if (!this.state) return;

        const current = this.state.players.find(p => p.id === this.state.settings.current_player_id);
        // If current player already belongs to this category and is Live, just filter the queue
        if (current && current.category_id === catId && current.status === "Live") {
            this.renderAll();
            return;
        }

        // Don't interrupt mid-bid; operator must SOLD/UNSOLD first
        if (this.state.settings.highest_bidder_id) {
            this.showToast("Finish current bid (SOLD / Unsold) before switching category.", "error");
            this.renderAll();
            return;
        }

        const firstUpcoming = this.state.players
            .filter(p => p.category_id === catId && (p.status === "Upcoming" || p.status === "Live"))
            .sort((a, b) => a.auction_order - b.auction_order)[0];

        if (!firstUpcoming) {
            this.showToast("No players left in this category.", "info");
            this.renderAll();
            return;
        }

        if (firstUpcoming.status === "Live" && firstUpcoming.id === this.state.settings.current_player_id) {
            this.renderAll();
            return;
        }

        try {
            await API.updatePlayer(firstUpcoming.id, { status: "Live" });
            this.showToast(`${firstUpcoming.name} loaded for ${firstUpcoming.category_name}`, "success");
            await this.sync();
        } catch (e) {
            this.showToast(e.message, "error");
            this.renderAll();
        }
    }

    // Bid Handlers — simplified operator desk
    // +10 / +20 immediately bumps the displayed current bid
    // Clicking a team assigns them as highest bidder at that price
    async handleStepBid(increment) {
        if (!this.state || !this.state.settings.current_player_id) {
            this.showToast("No active player on the desk!", "error");
            return;
        }
        try {
            const newState = await API.bumpBid(increment);
            if (newState) this.state = newState;
            this.soundBid();
            this.renderAll();
            this.showToast(`Bid updated to ${this.state.settings.highest_bid.toLocaleString()} coins`, "info");
        } catch (e) {
            this.soundError();
            this.showToast(e.message, "error");
        }
    }

    async handleQuickTeamBid(teamId) {
        if (!this.state || !this.state.settings.current_player_id) {
            this.showToast("No active player to bid on!", "error");
            return;
        }
        const amount = this.state.settings.highest_bid;
        try {
            const newState = await API.placeBid(teamId, amount);
            if (newState) this.state = newState;
            this.soundBid();
            const bidTeam = this.state.teams.find(t => t.id === teamId);
            const tName = bidTeam ? bidTeam.name : "Team";
            this.showToast(`${tName} leading at ${amount.toLocaleString()} coins`, "success");
            this.renderAll();
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

        // Custom Bid Button & Input Enter — set absolute bid amount
        const customBidBtn = document.getElementById("btnCustomBid");
        const customBidInputEl = document.getElementById("customBidInput");
        if (customBidBtn) {
            customBidBtn.addEventListener("click", async () => {
                const val = parseInt(document.getElementById("customBidInput").value);
                if (!val || isNaN(val) || val <= 0) {
                    this.showToast("Enter a valid custom bid amount first!", "error");
                    return;
                }
                try {
                    const newState = await API.setBidAmount(val);
                    if (newState) this.state = newState;
                    this.soundBid();
                    this.showToast(`Bid set to ${val.toLocaleString()} coins`, "info");
                    this.renderAll();
                    customBidInputEl.value = "";
                } catch (e) {
                    this.soundError();
                    this.showToast(e.message, "error");
                }
            });
        }
        if (customBidInputEl && customBidBtn) {
            customBidInputEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    customBidBtn.click();
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

        // Action Bar: Mark Sold → celebration → sync next player
        const markSoldBtn = document.getElementById("btnMarkSold");
        if (markSoldBtn) {
            markSoldBtn.addEventListener("click", async () => {
                const s = this.state.settings;
                if (!s.current_player_id) {
                    this.showToast("No active player to sell!", "error");
                    return;
                }
                if (!s.highest_bidder_id) {
                    this.showToast("Select a winning team from the right panel first!", "error");
                    return;
                }
                const player = this.state.players.find(x => x.id === s.current_player_id);
                const team = this.state.teams.find(t => t.id === s.highest_bidder_id);
                if (!player || !team) return;

                const price = s.highest_bid;
                const coinsBefore = team.coins;
                const coinsAfter = team.coins - price;

                // Optional confirm modal still available — skip for projector speed
                const modal = document.getElementById("soldConfirmModal");
                if (modal) modal.classList.add("hidden");

                markSoldBtn.disabled = true;
                try {
                    await API.sellPlayer();
                    await this.playSoldCelebration({
                        player,
                        team,
                        price,
                        coinsBefore,
                        coinsAfter
                    });
                    await this.sync();
                } catch (e) {
                    this.soundError();
                    this.showToast(e.message, "error");
                } finally {
                    markSoldBtn.disabled = false;
                }
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
            confirmSoldBtn.addEventListener("click", () => {
                document.getElementById("soldConfirmModal").classList.add("hidden");
                const soldBtn = document.getElementById("btnMarkSold");
                if (soldBtn) soldBtn.click();
            });
        }

        // Mark Unsold kept for keyboard / admin edge cases (hidden in UI)
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
