/**
 * render.js - Component rendering functions for White Luxury + Sports Premium Theme (Lucide & IPL/Apple Focus)
 */

const Render = {
    header(state) {
        const s = state.settings;
        const nameEl = document.getElementById("headerAuctionName");
        if (nameEl) nameEl.textContent = (s.auction_name && s.auction_name !== "CS Tennis Academy") ? s.auction_name : "BASCH";
        const subEl = document.getElementById("headerTournamentSubtitle");
        if (subEl) subEl.textContent = s.tournament_name || "Team Pickleball Championship 2026";

        const badge = document.getElementById("auctionStatusBadge");
        if (badge) {
            badge.style.display = "none";
        }

        const startBtn = document.getElementById("btnStartPause");
        if (startBtn) {
            if (s.auction_status === "LIVE") {
                startBtn.innerHTML = `<i data-lucide="pause"></i><span>Pause Auction</span>`;
                startBtn.className = "btn btn-warning";
            } else {
                startBtn.innerHTML = `<i data-lucide="play"></i><span>Start Auction</span>`;
                startBtn.className = "btn btn-primary";
            }
        }

        // Update global currency symbols without emoji
        document.querySelectorAll(".curr-symbol").forEach(el => el.textContent = s.currency_icon || "");
        if (window.lucide) lucide.createIcons();
    },

    progressBar(state) {
        const stats = state.statistics;
        const total = stats.total_players || 1;
        const sold = stats.players_sold || 0;
        const pct = Math.round((sold / total) * 100);

        const fill = document.getElementById("globalProgressBar");
        if (fill) fill.style.width = `${pct}%`;
        const txt = document.getElementById("globalProgressText");
        if (txt) txt.textContent = `${sold} / ${stats.total_players} Players Sold (${pct}%)`;
    },

    teams(state, onTeamClick) {
        const container = document.getElementById("teamsContainer");
        if (!container) return;
        const badge = document.getElementById("teamCountBadge");
        if (badge) badge.textContent = state.teams.length;
        container.innerHTML = "";

        const currentBidderId = state.settings.highest_bidder_id;
        const currencyIcon = state.settings.currency_icon || "";

        state.teams.forEach(t => {
            const isLeading = currentBidderId === t.id;
            const row = document.createElement("div");
            row.className = `team-row-compact ${isLeading ? "leading-bidder" : ""}`;
            row.style.borderLeft = `6px solid ${t.color}`;
            if (isLeading) {
                row.style.border = `2px solid #F4B400`;
                row.style.borderLeft = `6px solid #F4B400`;
            }

            row.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                    <strong style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 1.12rem; font-weight: 700; color: ${t.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.name}</strong>
                    <span style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 0.74rem; background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; border-radius: 4px; padding: 2px 8px; flex-shrink: 0;">Squad: ${t.squad_count}</span>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; font-size: 0.88rem; color: #475569; padding: 4px 0; border-top: 1px dashed #E2E8F0;">
                    <span style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;">Coins Left :</span>
                    <strong class="num-font" style="font-size: 1.05rem; color: #10B981; font-weight: 700;">${currencyIcon ? `${currencyIcon} ` : ''}${t.coins.toLocaleString()}</strong>
                </div>
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
            return;
        }

        noActiveBox.classList.add("hidden");
        activeContainer.classList.remove("hidden");

        // Find active player object
        const p = state.players.find(x => x.id === s.current_player_id);
        if (p) {
            const nameEl = document.getElementById("activePlayerName");
            if (nameEl) nameEl.textContent = p.name;
            const photoEl = document.getElementById("activePlayerPhoto");
            if (photoEl) photoEl.src = p.photo || "";
            const catEl = document.getElementById("activePlayerCategoryBadge");
            if (catEl) catEl.textContent = p.category_name;
            const bpEl = document.getElementById("activePlayerBasePrice");
            if (bpEl) bpEl.innerHTML = `Base: <strong class="num-font">${p.base_price.toLocaleString()}</strong>`;
            const rkEl = document.getElementById("activePlayerRanking");
            if (rkEl) rkEl.innerHTML = `Rank: <strong class="num-font">#${p.ranking || "-"}</strong>`;
            const sdEl = document.getElementById("activePlayerSeed");
            if (sdEl) sdEl.innerHTML = `Seed: <strong class="num-font">#${p.seed || "-"}</strong>`;
        }

        // Giant bid amount
        const bidEl = document.getElementById("currentBidAmount");
        if (bidEl) bidEl.textContent = s.highest_bid.toLocaleString();
        const timerEl = document.getElementById("timerDisplay");
        if (timerEl) {
            timerEl.textContent = `${s.timer_remaining}s`;
            if (s.timer_remaining <= 5) {
                timerEl.style.color = "#EF4444";
            } else {
                timerEl.style.color = "#FB923C";
            }
        }

        // Leading bidder banner (Team color & exact name without 'Leading:' prefix)
        const nameEl = document.getElementById("highestBidderName");
        if (nameEl) {
            if (s.highest_bidder_id) {
                const leadingTeam = state.teams.find(t => t.id === s.highest_bidder_id);
                nameEl.textContent = s.highest_bidder_name;
                nameEl.style.color = leadingTeam ? leadingTeam.color : "#059669";
            } else {
                nameEl.textContent = "Waiting for initial bid...";
                nameEl.style.color = "#9CA3AF";
            }
        }

        // Render step buttons (+10, +20, etc.) in one horizontal row with solid blue active state
        const stepContainer = document.getElementById("bidButtonsContainer");
        if (stepContainer) {
            stepContainer.innerHTML = "";
            const increments = s.bid_increments || [10, 20, 50, 100, 150, 200];
            increments.forEach(inc => {
                const btn = document.createElement("button");
                btn.className = "btn-bid-step";
                const isCustomActive = window.App && window.App.selectedCustomAmount !== null && window.App.selectedCustomAmount !== undefined;
                const activeInc = window.App ? window.App.selectedIncrement : null;
                const isSelected = !isCustomActive && (activeInc === inc);
                
                btn.style.cssText = `
                    height: 40px;
                    padding: 0 14px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: ${isSelected ? '1.5px solid #2563EB' : '1.5px solid #CBD5E1'};
                    background: ${isSelected ? '#2563EB' : '#FFFFFF'};
                    color: ${isSelected ? '#FFFFFF' : '#1E293B'};
                    box-shadow: ${isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'};
                `;
                btn.textContent = `+${inc}`;
                btn.onclick = () => onPlaceStepBid(inc);
                stepContainer.appendChild(btn);
            });
        }

        const customInput = document.getElementById("customBidInput");
        if (customInput && window.App) {
            if (window.App.selectedCustomAmount !== null && window.App.selectedCustomAmount !== undefined) {
                customInput.style.borderColor = "#2563EB";
                customInput.style.background = "#EFF6FF";
            } else {
                customInput.style.borderColor = "#CBD5E1";
                customInput.style.background = "#FFFFFF";
            }
        }

        // Render quick team selector buttons as clean auction cards inside 2-column grid
        const teamGrid = document.getElementById("quickTeamSelectorGrid");
        if (teamGrid) {
            teamGrid.innerHTML = "";
            state.teams.forEach(t => {
                const btn = document.createElement("button");
                const isLeading = s.highest_bidder_id === t.id;
                
                btn.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 3px;
                    padding: 8px 12px;
                    background: #FFFFFF;
                    border: ${isLeading ? `2px solid #2563EB` : '1.5px solid #CBD5E1'};
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.15s;
                    box-shadow: ${isLeading ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)'};
                    width: 100%;
                    text-align: left;
                `;
                
                btn.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; overflow: hidden;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${t.color}; display: inline-block; flex-shrink: 0;"></span>
                        <strong style="color: ${t.color}; font-size: 0.88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-heading);">${t.name}</strong>
                    </div>
                    <span class="num-font" style="color: #64748B; font-size: 0.82rem; font-weight: 600; padding-left: 18px;">${t.coins.toLocaleString()} Coins</span>
                `;
                btn.onclick = () => onQuickTeamBid(t.id);
                teamGrid.appendChild(btn);
            });
        }
        this.rightPanel(state);
        if (window.lucide) lucide.createIcons();
    },

    rightPanel(state) {
        // Live Bid Feed inside Console Left Section
        const histContainer = document.getElementById("bidHistoryList");
        const countEl = document.getElementById("bidHistoryCount");
        if (countEl) {
            const count = (state && state.bid_history) ? state.bid_history.length : 0;
            countEl.textContent = `${count} Bid${count !== 1 ? 's' : ''}`;
        }
        if (histContainer && state) {
            histContainer.innerHTML = "";
            if (!state.bid_history || state.bid_history.length === 0) {
                histContainer.innerHTML = `<p class="empty-text" style="color:#9CA3AF; font-size: 0.9rem;">No bids placed yet for this player.</p>`;
            } else {
                state.bid_history.slice(0, 15).forEach(bh => {
                    const item = document.createElement("div");
                    item.style.cssText = "display: flex; align-items: flex-start; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #E2E8F0;";
                    item.innerHTML = `
                        <div>
                            <strong style="font-size: 0.95rem; color: ${bh.team_color}; display: block; font-weight: 700;">${bh.team_name}</strong>
                            <span style="font-size: 11px; color: #6B7280;">${bh.timestamp}</span>
                        </div>
                        <strong class="num-font" style="font-size: 1.05rem; color: ${bh.team_color}; font-weight: 700;">${bh.amount.toLocaleString()}</strong>
                    `;
                    histContainer.appendChild(item);
                });
            }
        }
    },

    categoryTabs(state, selectedCategoryId, onSelect) {
        const bar = document.getElementById("categoryTabsBar");
        if (!bar) return;
        bar.innerHTML = "";

        const categories = state.categories || [];
        const players = state.players || [];

        // "All" pill
        const allCount = players.length;
        const allPill = document.createElement("button");
        allPill.className = `cat-pill ${!selectedCategoryId ? "active" : ""}`;
        allPill.innerHTML = `<span>All Players</span><span class="cat-badge">${allCount}</span>`;
        allPill.onclick = () => onSelect(null);
        bar.appendChild(allPill);

        // One pill per category
        categories.forEach(cat => {
            const count = players.filter(p => p.category_id === cat.id).length;
            const soldCount = players.filter(p => p.category_id === cat.id && p.status === "Sold").length;
            const isActive = selectedCategoryId === cat.id;

            const pill = document.createElement("button");
            pill.className = `cat-pill ${isActive ? "active" : ""}`;
            pill.innerHTML = `
                <span>${cat.name}</span>
                <span class="cat-badge" style="${isActive ? '' : ''}">
                    ${soldCount}/${count}
                </span>
            `;
            pill.title = `${cat.name}: ${soldCount} sold of ${count} total`;
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
        if (selectedCategoryId) {
            filtered = filtered.filter(p => p.category_id === selectedCategoryId);
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
            container.innerHTML = `<p class="empty-text" style="width:100%; text-align:center; padding:20px 0;">No players in this list.</p>`;
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement("div");
            card.className = "slider-card-compact";
            const isLive = p.status === "Live";
            card.style.cssText = `background: #FFFFFF; border: 1.5px solid ${isLive ? '#2563EB' : 'var(--border-color)'}; border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.15s ease; box-shadow: var(--shadow-sm); flex-shrink: 0;`;

            const currencyIcon = (state && state.settings && state.settings.currency_icon) ? state.settings.currency_icon : '🪙';
            let priceText = `Base: <strong class="num-font" style="color:#111827;">${currencyIcon} ${p.base_price.toLocaleString()}</strong>`;
            if (p.status === "Sold") {
                priceText = `Sold: <strong class="num-font" style="color:#047857; font-weight:800;">${currencyIcon} ${p.sold_price ? p.sold_price.toLocaleString() : '0'}</strong> ${p.sold_to_name ? `to <span style="font-weight:700; color:#1E293B;">${p.sold_to_name}</span>` : ''}`;
            } else if (p.status === "Unsold") {
                priceText = `<span style="color:#64748B; font-weight:700;">Unsold</span> (Base: ${currencyIcon} ${p.base_price.toLocaleString()})`;
            }

            card.innerHTML = `
                <img src="${p.photo || ''}" class="slider-thumb-sm" alt="${p.name}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; flex-shrink:0;">
                <div style="overflow:hidden; flex:1;">
                    <h4 style="font-family:var(--font-heading); font-size:0.86rem; font-weight:700; color:#111827; margin:0 0 2px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name} ${isLive ? '<span style="color:#2563EB;">● Live</span>' : ''}</h4>
                    <p style="font-size:0.75rem; color:var(--text-secondary); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.category_name} • ${priceText}</p>
                </div>
            `;
            card.onclick = () => onSelectPlayer(p);
            container.appendChild(card);
        });
    },

    teamDetailsModal(team, currencyIcon) {
        const nameEl = document.getElementById("teamModalName");
        if (nameEl) nameEl.textContent = `${team.name}`;
        const headStyle = document.getElementById("teamModalHeaderStyle");
        if (headStyle) headStyle.style.borderTop = `6px solid ${team.color}`;
        
        const coinsEl = document.getElementById("teamModalCoins");
        if (coinsEl) coinsEl.textContent = `${currencyIcon} ${team.coins.toLocaleString()}`;
        const spentEl = document.getElementById("teamModalSpent");
        if (spentEl) spentEl.textContent = `${currencyIcon} ${team.money_spent.toLocaleString()}`;
        const sizeEl = document.getElementById("teamModalSquadSize");
        if (sizeEl) sizeEl.textContent = `${team.squad_count} Players`;
        const avgEl = document.getElementById("teamModalAvgCost");
        const avg = team.squad_count > 0 ? Math.round(team.money_spent / team.squad_count) : 0;
        if (avgEl) avgEl.textContent = `${currencyIcon} ${avg.toLocaleString()}`;

        const list = document.getElementById("teamModalSquadList");
        if (list) {
            list.innerHTML = "";
            if (team.squad.length === 0) {
                list.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:16px;">No players purchased yet.</p>`;
            } else {
                team.squad.forEach(p => {
                    const item = document.createElement("div");
                    item.style.background = "#F8FAFC";
                    item.style.border = "1px solid var(--border-color)";
                    item.style.padding = "8px 12px";
                    item.style.borderRadius = "8px";
                    item.style.display = "flex";
                    item.style.alignItems = "center";
                    item.style.gap = "10px";
                    item.innerHTML = `
                        <img src="${p.photo}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">
                        <div>
                            <div style="font-weight:700;font-size:0.88rem;color:#111827;">${p.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">${p.category_name} • Sold: <strong class="num-font" style="color:#10B981;">${currencyIcon} ${p.sold_price}</strong></div>
                        </div>
                    `;
                    list.appendChild(item);
                });
            }
        }
    }
};

window.Render = Render;
