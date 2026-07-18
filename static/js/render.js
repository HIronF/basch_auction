/**
 * render.js - Auction desk rendering (simplified operator flow)
 */

const CAT_SHORT = {
    "Under 12": "U12",
    "Beginner": "Beginner",
    "Intermediate": "Intermediate",
    "Advanced": "Advanced"
};

const Render = {
    header(state) {
        const s = state.settings;
        const nameEl = document.getElementById("headerAuctionName");
        if (nameEl) nameEl.textContent = s.auction_name || "Player Auction";
        const subEl = document.getElementById("headerTournamentSubtitle");
        if (subEl) subEl.textContent = s.tournament_name || "";

        const totalEl = document.getElementById("statTotalPlayers");
        if (totalEl && state.statistics) totalEl.textContent = state.statistics.total_players || state.players.length;
        const budgetEl = document.getElementById("statBudgetPerTeam");
        if (budgetEl) budgetEl.textContent = (s.starting_coins || 1000).toLocaleString();

        if (window.lucide) lucide.createIcons();
    },

    progressBar() {
        // Progress strip removed from desk UI
    },

    teams(state, onTeamClick) {
        const container = document.getElementById("teamsContainer");
        if (!container) return;
        const badge = document.getElementById("teamCountBadge");
        if (badge) badge.textContent = state.teams.length;
        container.innerHTML = "";

        const currentBidderId = state.settings.highest_bidder_id;
        const categories = state.categories || [];

        state.teams.forEach(t => {
            const isLeading = currentBidderId === t.id;
            const row = document.createElement("div");
            row.className = `team-row-compact ${isLeading ? "leading-bidder" : ""}`;
            row.dataset.teamId = t.id;

            const slotsHtml = categories.map(cat => {
                const short = CAT_SHORT[cat.name] || cat.name;
                const owned = (t.squad || []).filter(p => p.category_id === cat.id);
                if (owned.length === 0) {
                    return `<div class="squad-slot empty">
                        <span class="slot-cat">${short}</span>
                        <span class="slot-dash">—</span>
                    </div>`;
                }
                const p = owned[0];
                return `<div class="squad-slot filled" title="${p.name} · ${p.sold_price} coins">
                    <span class="slot-cat">${short}</span>
                    <span class="slot-player">
                        <span class="slot-check" aria-hidden="true">✅</span>
                        <span class="slot-name">${p.name.toUpperCase()}</span>
                    </span>
                </div>`;
            }).join("");

            row.innerHTML = `
                <div class="team-row-top">
                    <img src="${t.logo || ''}" alt="${t.name}" class="team-logo-sm" onerror="this.style.display='none'">
                    <strong class="team-name" style="color:${t.color}">${t.name}</strong>
                </div>
                <div class="team-squad-slots">${slotsHtml}</div>
            `;
            row.onclick = () => onTeamClick(t);
            container.appendChild(row);
        });
        if (window.lucide) lucide.createIcons();
    },

    liveArena(state, onPlaceStepBid, onQuickTeamBid) {
        const s = state.settings;
        const noActiveBox = document.getElementById("noActivePlayerState");
        const activeContainer = document.getElementById("activeArenaContainer");
        if (!noActiveBox || !activeContainer) return;

        if (!s.current_player_id) {
            noActiveBox.classList.remove("hidden");
            activeContainer.classList.add("hidden");
            this.renderBidders(state, onQuickTeamBid);
            return;
        }

        noActiveBox.classList.add("hidden");
        activeContainer.classList.remove("hidden");

        const p = state.players.find(x => x.id === s.current_player_id);
        if (p) {
            const nameEl = document.getElementById("activePlayerName");
            if (nameEl) nameEl.textContent = p.name;
            const photoEl = document.getElementById("activePlayerPhoto");
            if (photoEl) photoEl.src = p.photo || "";
            const catEl = document.getElementById("activePlayerCategoryBadge");
            if (catEl) catEl.textContent = p.category_name;
            const bpVisible = document.getElementById("activePlayerBasePriceVisible");
            if (bpVisible) bpVisible.textContent = p.base_price.toLocaleString();
            const bpEl = document.getElementById("activePlayerBasePrice");
            if (bpEl) bpEl.textContent = p.base_price;
        }

        const bidEl = document.getElementById("currentBidAmount");
        if (bidEl) bidEl.textContent = s.highest_bid.toLocaleString();

        const nameEl = document.getElementById("highestBidderName");
        const logoEl = document.getElementById("highestBidderLogo");
        if (nameEl) {
            if (s.highest_bidder_id) {
                const leadingTeam = state.teams.find(t => t.id === s.highest_bidder_id);
                nameEl.textContent = s.highest_bidder_name;
                nameEl.style.color = leadingTeam ? leadingTeam.color : "#059669";
                if (logoEl) {
                    if (leadingTeam && leadingTeam.logo) {
                        logoEl.src = leadingTeam.logo;
                        logoEl.classList.remove("hidden");
                    } else {
                        logoEl.classList.add("hidden");
                    }
                }
            } else {
                nameEl.textContent = "Select a team from the right panel";
                nameEl.style.color = "#9CA3AF";
                if (logoEl) logoEl.classList.add("hidden");
            }
        }

        const stepContainer = document.getElementById("bidButtonsContainer");
        if (stepContainer) {
            stepContainer.innerHTML = "";
            const increments = s.bid_increments || [10, 20, 50, 100, 150, 200];
            increments.forEach(inc => {
                const btn = document.createElement("button");
                btn.className = "btn-bid-step";
                btn.textContent = `+${inc}`;
                btn.onclick = () => onPlaceStepBid(inc);
                stepContainer.appendChild(btn);
            });
        }

        this.renderBidders(state, onQuickTeamBid);
        if (window.lucide) lucide.createIcons();
    },

    renderBidders(state, onQuickTeamBid) {
        const teamGrid = document.getElementById("quickTeamSelectorGrid");
        if (!teamGrid) return;

        // Preserve animated coin values if celebration is mid-flight
        const prevCoins = {};
        teamGrid.querySelectorAll("[data-team-id]").forEach(el => {
            const id = el.dataset.teamId;
            const coinEl = el.querySelector("[data-coin-value]");
            if (id && coinEl) prevCoins[id] = coinEl.textContent;
        });

        teamGrid.innerHTML = "";
        const s = state.settings;

        state.teams.forEach((t, idx) => {
            const isLeading = s.highest_bidder_id === t.id;
            const row = document.createElement("button");
            row.className = `bidder-row ${isLeading ? "is-leading" : ""}`;
            row.dataset.teamId = t.id;
            row.innerHTML = `
                <span class="bidder-rank">${idx + 1}</span>
                <img src="${t.logo || ''}" alt="" class="bidder-logo" onerror="this.style.display='none'">
                <div class="bidder-info">
                    <strong style="color:${t.color}">${t.name}</strong>
                    <span class="bidder-coins-line">
                        <span class="coin-icon">🪙</span>
                        <strong class="num-font" data-coin-value>${t.coins.toLocaleString()}</strong>
                        <span>Coins Left</span>
                    </span>
                </div>
            `;
            row.onclick = () => onQuickTeamBid(t.id);
            teamGrid.appendChild(row);
        });
        if (window.lucide) lucide.createIcons();
    },

    rightPanel() {
        // Bid history now lives in Highest Bidders panel via renderBidders
    },

    categoryTabs(state, selectedCategoryId, onSelect) {
        const bar = document.getElementById("categoryTabsBar");
        if (!bar) return;
        bar.innerHTML = "";

        const categories = state.categories || [];
        const players = state.players || [];
        const currentCatId = state.settings && state.settings.current_category_id;

        categories.forEach(cat => {
            const count = players.filter(p => p.category_id === cat.id).length;
            const soldCount = players.filter(p => p.category_id === cat.id && p.status === "Sold").length;
            const isActive = selectedCategoryId === cat.id || (!selectedCategoryId && currentCatId === cat.id);

            const pill = document.createElement("button");
            pill.className = `cat-pill ${isActive ? "active" : ""}`;
            if (isActive) pill.style.borderColor = cat.color;
            pill.innerHTML = `
                <span>${cat.name.toUpperCase()}</span>
                <span class="cat-badge">${soldCount} / ${count}</span>
            `;
            pill.title = `${cat.name}: ${soldCount} sold of ${count}`;
            pill.onclick = () => onSelect(cat.id);
            bar.appendChild(pill);
        });
    },

    upcomingSlider(state, selectedQueue, selectedCategoryId, onSelectPlayer) {
        const container = document.getElementById("upcomingSlider");
        if (!container) return;
        container.innerHTML = "";

        const titleEl = document.getElementById("currentQueueTitle");
        const countBadge = document.getElementById("queueCountBadge");
        const dropdown = document.getElementById("queueSelectDropdown");

        let filtered = state.players;
        const catFilter = selectedCategoryId || (state.settings && state.settings.current_category_id);
        if (catFilter) {
            filtered = filtered.filter(p => p.category_id === catFilter);
        }

        if (selectedQueue === "live" || selectedQueue === "upcoming") {
            if (titleEl) titleEl.textContent = "Upcoming Players";
            if (dropdown && dropdown.value !== "live") dropdown.value = "live";
            filtered = filtered.filter(p => p.status === "Upcoming" || p.status === "Live");
        } else if (selectedQueue === "sold") {
            if (titleEl) titleEl.textContent = "Sold Roster";
            if (dropdown && dropdown.value !== "sold") dropdown.value = "sold";
            filtered = filtered.filter(p => p.status === "Sold");
        } else if (selectedQueue === "unsold") {
            if (titleEl) titleEl.textContent = "Unsold Pool";
            if (dropdown && dropdown.value !== "unsold") dropdown.value = "unsold";
            filtered = filtered.filter(p => p.status === "Unsold");
        }

        if (countBadge) countBadge.textContent = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `<p class="empty-text" style="width:100%; text-align:center; padding:12px 0;">No players in this list.</p>`;
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement("div");
            const isLive = p.status === "Live";
            card.className = `next-player-card ${isLive ? "is-live" : ""}`;
            card.innerHTML = `
                <img src="${p.photo || ''}" alt="${p.name}">
                <div>
                    <h4>${p.name}${isLive ? ' <span class="live-dot">●</span>' : ''}</h4>
                    <p>${p.category_name}</p>
                </div>
            `;
            card.onclick = () => onSelectPlayer(p);
            container.appendChild(card);
        });
    },

    teamDetailsModal(team, currencyIcon) {
        const nameEl = document.getElementById("teamModalName");
        if (nameEl) nameEl.textContent = team.name;
        const headStyle = document.getElementById("teamModalHeaderStyle");
        if (headStyle) headStyle.style.borderTop = `6px solid ${team.color}`;

        const coinsEl = document.getElementById("teamModalCoins");
        if (coinsEl) coinsEl.textContent = `${currencyIcon || "🪙"} ${team.coins.toLocaleString()}`;
        const spentEl = document.getElementById("teamModalSpent");
        if (spentEl) spentEl.textContent = `${currencyIcon || "🪙"} ${team.money_spent.toLocaleString()}`;
        const sizeEl = document.getElementById("teamModalSquadSize");
        if (sizeEl) sizeEl.textContent = `${team.squad_count} Players`;
        const avgEl = document.getElementById("teamModalAvgCost");
        const avg = team.squad_count > 0 ? Math.round(team.money_spent / team.squad_count) : 0;
        if (avgEl) avgEl.textContent = `${currencyIcon || "🪙"} ${avg.toLocaleString()}`;

        const list = document.getElementById("teamModalSquadList");
        if (list) {
            list.innerHTML = "";
            if (team.squad.length === 0) {
                list.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:16px;">No players purchased yet.</p>`;
            } else {
                team.squad.forEach(p => {
                    const item = document.createElement("div");
                    item.style.cssText = "background:#F8FAFC;border:1px solid var(--border-color);padding:8px 12px;border-radius:8px;display:flex;align-items:center;gap:10px;";
                    item.innerHTML = `
                        <img src="${p.photo}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">
                        <div>
                            <div style="font-weight:700;font-size:0.88rem;color:#111827;">${p.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">${p.category_name} • Sold: <strong class="num-font" style="color:#10B981;">${currencyIcon || "🪙"} ${p.sold_price}</strong></div>
                        </div>
                    `;
                    list.appendChild(item);
                });
            }
        }
    }
};

window.Render = Render;
