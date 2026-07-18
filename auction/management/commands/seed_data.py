import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from auction.models import AuctionSettings, BidHistory, Category, Player, Team

ROSTER_PATH = Path(__file__).resolve().parents[3] / "static" / "data" / "roster.json"


class Command(BaseCommand):
    help = "Seed the database from static/data/roster.json"

    @transaction.atomic
    def handle(self, *args, **options):
        if not ROSTER_PATH.exists():
            raise FileNotFoundError(f"Roster file not found: {ROSTER_PATH}")

        with open(ROSTER_PATH, encoding="utf-8") as f:
            roster = json.load(f)

        self.stdout.write(f"Seeding from {ROSTER_PATH}...")

        BidHistory.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()
        Category.objects.all().delete()
        AuctionSettings.objects.all().delete()

        settings_data = roster.get("settings") or {}
        starting_coins = int(settings_data.get("starting_coins", 1000))

        category_map = {}
        for index, cat in enumerate(roster.get("categories") or [], start=1):
            obj = Category.objects.create(
                name=cat["name"],
                color=cat.get("color") or "#3B82F6",
                player_limit=int(cat.get("player_limit") or len(cat.get("players") or []) or 6),
                display_order=index,
            )
            category_map[cat["name"]] = obj

        for team in roster.get("teams") or []:
            Team.objects.create(
                name=team["name"],
                logo=(team.get("logo") or "").strip() or None,
                color=team.get("color") or "#10B981",
                coins=starting_coins,
                starting_coins=starting_coins,
            )

        order = 1
        first_player = None
        for cat in roster.get("categories") or []:
            cat_obj = category_map[cat["name"]]
            for rank, player in enumerate(cat.get("players") or [], start=1):
                photo = (player.get("photo") or "").strip()
                obj = Player.objects.create(
                    name=player["name"],
                    photo=photo or None,
                    category=cat_obj,
                    base_price=int(player.get("base_price") or 100),
                    sold_price=0,
                    sold_to=None,
                    status="Upcoming",
                    ranking=rank,
                    seed=rank,
                    auction_order=order,
                )
                if first_player is None:
                    first_player = obj
                order += 1

        if first_player:
            first_player.status = "Live"
            first_player.save()

        AuctionSettings.objects.create(
            auction_name=settings_data.get("auction_name") or "Player Auction",
            tournament_name=(
                settings_data.get("tournament_name")
                or roster.get("tournament_title")
                or "Team Championship"
            ),
            sport_name=settings_data.get("sport_name") or "Lawn Tennis",
            starting_coins=starting_coins,
            timer=int(settings_data.get("timer", 30)),
            bid_increments=settings_data.get("bid_increments") or "10,20,50,100,150,200",
            currency_name=settings_data.get("currency_name") or "Coins",
            currency_icon=settings_data.get("currency_icon") or "🪙",
            current_category=first_player.category if first_player else None,
            current_player=first_player,
            highest_bid=first_player.base_price if first_player else 0,
            highest_bidder=None,
            timer_remaining=int(settings_data.get("timer", 30)),
            auction_status="LIVE" if first_player else "READY",
        )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Team.objects.count()} teams, {Category.objects.count()} categories, "
            f"and {Player.objects.count()} players from roster.json"
        ))
