/**
 * render.js - Auction desk rendering (Championship UI)
 */

const CAT_SHORT = {
    "Junior Players": "JUN",
    "Intermediate A": "INT A",
    "Intermediate B": "INT B",
    "Advanced": "CAP",
    "Advanced (Captain)": "CAP",
    "Under 12": "JUN",
    "Beginner": "INT A",
    "Intermediate": "INT B"
};

function isAdvancedCategory(name) {
    const n = (name || "").toLowerCase();
    return n === "advanced" || n.startsWith("advanced");
}

const Render = {
    header(state) {
        const s = state.settings;
        const nameEl = document.getElementById("headerAuctionName");
        if (nameEl) {
            nameEl.textContent = (s.tournament_name || "CS TENNIS ACADEMY CHAMPIONSHIP 2026").toUpperCase();
        }
        const subEl = document.getElementById("headerTournamentSubtitle");
        if (subEl) subEl.textContent = "PLAYER AUCTION";

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

        state.teams.forEach((t, idx) => {
            const isLeading = currentBidderId === t.id;
            const row = document.createElement("div");
            row.className = `team-row-compact ${isLeading ? "leading-bidder" : ""}`;
            row.dataset.teamId = t.id;

            const slotsHtml = categories.map(cat => {
                const short = CAT_SHORT[cat.name] || cat.name.slice(0, 3).toUpperCase();
                const owned = (t.squad || []).filter(p => p.category_id === cat.id);
                const filled = owned.length > 0;
                const title = filled ? `${owned[0].name} · ${owned[0].sold_price} coins` : `${cat.name}: empty`;
                return `<div class="slot-circle ${filled ? "filled" : ""}" title="${title}">
                    <span class="slot-circle-label">${short}</span>
                    <span class="slot-circle-dot">${filled ? "✓" : ""}</span>
                </div>`;
            }).join("");

            const logoHtml = t.logo
                ? `<img src="${t.logo}" alt="${t.name}" class="team-logo-sm" onerror="this.style.display='none'">`
                : `<span class="team-logo-sm" style="display:flex;align-items:center;justify-content:center;background:#EFF6FF;">🏆</span>`;

            const accent = t.color || "#1E3A8A";
            row.innerHTML = `
                <div class="team-card-main">
                    <span class="team-index" style="background:${accent};color:#fff;">${idx + 1}</span>
                    ${logoHtml}
                    <div class="team-card-info">
                        <strong class="team-card-name">${t.name}</strong>
                        <span class="team-card-coins"><span class="coin-icon">🪙</span>${t.coins.toLocaleString()}</span>
        
                    </div>
                </div>
                <div class="team-slot-circles">${slotsHtml}</div>
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
            if (photoEl) {
                const photo = (p.photo || "").trim();
                if (photo) {
                    photoEl.classList.remove("is-empty");
                    photoEl.src = photo;
                } else {
                    photoEl.removeAttribute("src");
                    photoEl.classList.add("is-empty");
                }
            }
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
        const statusEl = document.getElementById("highestBidderStatus");
        const bidderCard = document.querySelector(".arena-highest-bidder");
        if (statusEl) statusEl.classList.add("hidden");
        if (nameEl) {
            if (s.highest_bidder_id) {
                const leadingTeam = state.teams.find(t => t.id === s.highest_bidder_id);
                nameEl.textContent = s.highest_bidder_name;
                nameEl.style.color = "#1E3A8A";
                if (bidderCard) {
                    bidderCard.classList.add("has-leader");
                    if (leadingTeam && leadingTeam.color) {
                        bidderCard.style.setProperty("--leader-color", leadingTeam.color);
                    }
                }
                if (logoEl) {
                    if (leadingTeam && leadingTeam.logo) {
                        logoEl.src = leadingTeam.logo;
                        logoEl.classList.remove("hidden");
                    } else {
                        logoEl.classList.add("hidden");
                    }
                }
            } else {
                nameEl.textContent = "Select a team below";
                nameEl.style.color = "#9CA3AF";
                if (bidderCard) {
                    bidderCard.classList.remove("has-leader");
                    bidderCard.style.removeProperty("--leader-color");
                }
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

        teamGrid.innerHTML = "";
        const s = state.settings;

        state.teams.forEach((t, idx) => {
            const isLeading = s.highest_bidder_id === t.id;
            const row = document.createElement("button");
            row.className = `bidder-row ${isLeading ? "is-leading" : ""}`;
            row.dataset.teamId = t.id;
            row.type = "button";
            row.innerHTML = `
                <span class="bidder-rank">${idx + 1}</span>
                <div class="bidder-info">
                    <strong style="color:${t.color || '#1E3A8A'}">${t.name}</strong>
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

        const categories = (state.categories || []).filter(c => !isAdvancedCategory(c.name));
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
                <span class="cat-badge">${soldCount}/${count}</span>
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
            const photo = (p.photo || "").trim();
            card.innerHTML = `
                ${photo
                    ? `<img src="${photo}" alt="${p.name}" onerror="this.style.display='none'">`
                    : `<div style="width:44px;height:44px;border-radius:10px;background:#1E3A8A;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;flex-shrink:0;">${(p.name || "?").charAt(0)}</div>`}
                <div>
                    <h4>${p.name}${isLive ? ' <span class="live-dot">●</span>' : ''}</h4>
                    <p>${p.category_name}</p>
                </div>
            `;
            card.onclick = () => onSelectPlayer(p);
            container.appendChild(card);
        });
    },

    finalTeams(state) {
        const grid = document.getElementById("finalTeamsGrid");
        const statsEl = document.getElementById("finalTeamsStats");
        if (!grid) return;

        const categories = state.categories || [];
        const icon = (state.settings && state.settings.currency_icon) || "🪙";

        grid.innerHTML = (state.teams || []).map(t => {
            const members = categories.map(cat => {
                const owned = (t.squad || []).filter(p => p.category_id === cat.id);
                if (!owned.length) {
                    return `<div class="final-squad-item">
                        <div>
                            <div class="fs-name" style="color:#94A3B8;">Empty slot</div>
                            <div class="fs-cat">${cat.name}</div>
                        </div>
                    </div>`;
                }
                const p = owned[0];
                return `<div class="final-squad-item">
                    <div>
                        <div class="fs-name">${p.name}</div>
                        <div class="fs-cat">${p.category_name || cat.name}</div>
                    </div>
                    <div class="fs-price">${icon} ${(p.sold_price || 0).toLocaleString()}</div>
                </div>`;
            }).join("");

            const logo = t.logo
                ? `<img src="${t.logo}" alt="" onerror="this.style.display='none'">`
                : `<div style="width:130px;height:130px;border-radius:18px;background:#1E3A8A;display:flex;align-items:center;justify-content:center;">🏆</div>`;

            return `<article class="final-team-card" style="border-color:${t.color || 'rgba(148,163,184,0.22)'}">
                <div class="final-team-head">
                    ${logo}
                    <div>
                        <h3 style="color:${t.color || '#fff'}">${t.name}</h3>
                        <p>${icon} ${t.coins.toLocaleString()} left · ${t.squad_count || 0} players</p>
                    </div>
                </div>
                <div class="final-squad-list">
                    ${members || `<div class="final-empty">No players purchased.</div>`}
                </div>
            </article>`;
        }).join("");

        if (statsEl) {
            const st = state.statistics || {};
            statsEl.innerHTML = `
                <div class="final-stat-chip">Most expensive: <strong>${st.most_expensive_player || "—"}</strong>
                    (${icon} ${(st.most_expensive_price || 0).toLocaleString()})</div>
                <div class="final-stat-chip">Richest team: <strong>${st.richest_team || "—"}</strong>
                    (${icon} ${(st.richest_team_coins || 0).toLocaleString()} left)</div>
                <div class="final-stat-chip">Players sold: <strong>${st.players_sold || 0}</strong> / ${st.total_players || state.players.length}</div>
            `;
        }

        if (window.lucide) lucide.createIcons();
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
                    const photo = (p.photo || "").trim();
                    item.innerHTML = `
                        ${photo
                            ? `<img src="${photo}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">`
                            : `<div style="width:36px;height:36px;border-radius:6px;background:#1E3A8A;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;">${(p.name || "?").charAt(0)}</div>`}
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
